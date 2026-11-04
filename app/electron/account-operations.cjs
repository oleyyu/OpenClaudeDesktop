// Codex 0.155.1 account lifecycle. No profile/config writes or invented account data.
const {coreError}=require('./codex.cjs');
const {coreForEngine,coreSupports}=require('./core-registry.mjs');
const i18n=require('./i18n/index.mjs');
function createAccountOperations({getClient,openExternal,onState=()=>{},onAccount=()=>{}}) {
  let state={phase:'idle',login:null,error:'',notice:''},attempt=null,epoch=0,readRevision=0,accountSnapshot=null;
  const accountChanged=value=>{accountSnapshot=value;onAccount(value);};
  const publish=patch=>{state={...state,...patch};onState(state);return state;};
  const current=t=>attempt===t&&t.epoch===epoch&&t.owner===getClient();
  const requireCurrent=t=>{if(!current(t))throw coreError(t.owner,'The {core} connection changed. Try again.');};
  const url=value=>{const parsed=new URL(value);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Invalid sign-in URL.');return parsed.href;};
  async function refresh(owner=getClient()) {
    const generation=epoch,revision=++readRevision;
    try {
      await owner.start();if(owner!==getClient()||generation!==epoch||revision!==readRevision)return null;
      const account=await owner.request('account/read',{refreshToken:false});
      if(owner!==getClient()||generation!==epoch||revision!==readRevision)return null;
      accountChanged(account);return account;
    }catch(error){if(owner!==getClient()||generation!==epoch||revision!==readRevision)return null;throw error;}
  }

  async function finish(t,event) {
    if(!current(t))return;
    attempt=null;readRevision++;
    if(!event.success){publish({phase:'idle',login:null,error:event.error||'Sign-in failed. Try again.'});return;}
    // signedInAt: when a sign-in last succeeded here, so an older 'Authentication failed' card reads 'Signed in again'.
    const generation=epoch;publish({phase:'refreshing',login:null,error:'',signedInAt:Date.now()});
    try {await refresh(t.owner);if(generation===epoch&&t.owner===getClient()&&!attempt)publish({phase:'idle',error:''});}
    catch(error){if(generation===epoch&&t.owner===getClient()&&!attempt)publish({phase:'idle',error:error.message});}
  }
  // A bridge core's API key (core descriptor `login.apiKey`): saved by the core at once, no browser step.
  async function startApiKey(options={}) {
    const apiKey=typeof options.apiKey==='string'?options.apiKey.trim():'';
    if(!apiKey||apiKey.length>4096||/[\x00-\x1f\x7f]/.test(apiKey))throw Error('Enter a valid API key.');
    if(state.phase!=='idle'||attempt)throw Error('Finish or cancel the current account operation first.');
    const owner=getClient();
    const mismatch=keyTypeMismatch(owner,options.codeDesktop?.template,apiKey);if(mismatch)throw mismatch;
    readRevision++;
    publish({phase:'starting',login:null,error:'',notice:''});
    try {
      await owner.start();
      await owner.request('account/login/start',{type:'apiKey',apiKey,...(options.codeDesktop&&typeof options.codeDesktop==='object'?{codeDesktop:options.codeDesktop}:{})});
      publish({phase:'refreshing',login:null,error:'',signedInAt:Date.now()});
      await refresh(owner);publish({phase:'idle',error:''});
      return state;
    } catch(error){
      // A bridge's rejected key (data.codexErrorInfo 'unauthorized', message 'This API key was rejected: <provider>'):
      // the UI's own sentence naming the core, the provider's reason after it.
      const failure=error?.data?.codexErrorInfo==='unauthorized'?rejectedKey(owner,error):error;
      publish({phase:'idle',login:null,error:failure.message});throw failure;
    }
  }
  // A key pasted under the wrong Key type (descriptor login.apiKey keyPrefix, e.g. MiMo's tp- Token Plan keys vs its
  // sk- pay-as-you-go keys): the core would save it and every turn would fail. Refused only on positive evidence: the
  // key starts with another option's prefix, longer than any of the chosen option's; an unknown format passes.
  function keyTypeMismatch(owner,template,apiKey){
    const options=(coreForEngine(owner?.serverInfo?.engine).login?.apiKey??[]).filter(entry=>entry&&typeof entry==='object');
    const chosen=options.find(entry=>(entry.template??null)===(typeof template==='string'&&template?template:null));
    if(!chosen)return null;
    const fit=entry=>Math.max(0,...[].concat(entry.keyPrefix??[]).filter(prefix=>typeof prefix==='string'&&prefix&&apiKey.startsWith(prefix)).map(prefix=>prefix.length));
    const best=Math.max(0,...options.map(fit));
    if(!best||fit(chosen)===best)return null;
    const matches=options.filter(entry=>entry!==chosen&&fit(entry)===best).map(entry=>`“${i18n.t(entry.label)}”`);
    const values={label:i18n.t(chosen.label),option:matches.join(' / ')};
    return coreError(owner,matches.length>1?'This key doesn’t fit “{label}”. Under Key type, choose one of {option}.':'This key doesn’t fit “{label}”. Under Key type, choose {option}.',values);
  }
  function rejectedKey(owner,error){
    const detail=String(error?.message??'').replace(/^This API key was rejected:\s*/i,'').trim();
    const failure=coreError(owner,'This key was rejected by {core}.');
    if(detail&&detail!==error?.message?.trim?.())failure.message=`${failure.message} ${detail}`;
    failure.code=error?.code;failure.data=error?.data;return failure;
  }
  async function start(type='chatgpt',options={}) {
    if(type==='apiKey')return startApiKey(options);
    if(!['chatgpt','chatgptDeviceCode'].includes(type))throw Error('Unsupported sign-in method.');
    if(state.phase!=='idle'||attempt)throw Error('Finish or cancel the current account operation first.');
    const t={owner:getClient(),epoch,login:null,early:new Map()};attempt=t;readRevision++;
    publish({phase:'starting',login:null,error:'',notice:''});
    try {
      await t.owner.start();requireCurrent(t);
      // codeDesktop: a bridge core's sign-in option (e.g. which provider's browser sign-in, core descriptor `login`).
      const result=await t.owner.request('account/login/start',{type,...(options.codeDesktop&&typeof options.codeDesktop==='object'?{codeDesktop:options.codeDesktop}:{})});requireCurrent(t);
      if(result?.type!==type||typeof result.loginId!=='string'||!result.loginId)throw coreError(t.owner,'{core} returned an invalid sign-in response.');
      // Retain the true id even if URL validation/opening fails, so cancellation remains possible.
      // provider: which of the core's sign-in options started it, so Settings marks only that row as pending.
      const provider=typeof options.codeDesktop?.provider==='string'&&options.codeDesktop.provider?options.codeDesktop.provider:null;
      t.login={type,loginId:result.loginId,...(provider?{provider}:{})};
      publish({phase:'waiting',login:t.login,error:''});
      const completion=t.early.get(result.loginId);t.early.clear();
      if(completion){await finish(t,completion);return state;}
      const target=url(type==='chatgpt'?result.authUrl:result.verificationUrl);
      if(type==='chatgptDeviceCode'&&(typeof result.userCode!=='string'||!result.userCode))throw coreError(t.owner,'{core} returned an invalid device code.');
      // codeDesktop.openedByAgent: the agent opened its own sign-in tab (MiMo), so a second one would only confuse;
      // acceptsCode: the provider's page may end on a one-time code to paste back (codeDesktop/login/code).
      const opened=result.codeDesktop?.openedByAgent===true,acceptsCode=result.codeDesktop?.acceptsCode===true;
      t.login={...t.login,url:target,...(type==='chatgptDeviceCode'?{userCode:result.userCode}:{}),...(opened?{openedByAgent:true}:{}),...(acceptsCode?{acceptsCode:true}:{})};publish({login:t.login});
      if(!opened)await openExternal(target);if(current(t))publish({error:''});
      return state;
    } catch(error) {
      if(current(t)){if(!t.login)attempt=null;publish({phase:t.login?'waiting':'idle',login:t.login,error:error.message});}
      if(t.login && !current(t) && t.owner===getClient() && t.epoch===epoch)return state;
      throw error;
    }
  }
  async function cancel() {
    const t=attempt;
    if(!t?.login||state.phase!=='waiting')throw Error('No sign-in is ready to cancel.');
    publish({phase:'cancelling',error:''});
    try {
      const result=await t.owner.request('account/login/cancel',{loginId:t.login.loginId});requireCurrent(t);
      if(!['canceled','notFound'].includes(result?.status))throw coreError(t.owner,'{core} returned an invalid cancellation response.');
      if(result.status==='notFound'&&t.completion){await finish(t,t.completion);return state;}
      attempt=null;readRevision++;publish({phase:result.status==='notFound'?'refreshing':'idle',login:null,error:''});
      if(result.status==='notFound'){
        await refresh(t.owner);
        if(t.owner===getClient()&&t.epoch===epoch)publish({phase:'idle',error:''});
      }
      return state;
    }catch(error){
      if(current(t)&&t.completion){await finish(t,t.completion);return state;}
      if(current(t))publish({phase:'waiting',error:error.message});
      else if(t.owner===getClient()&&t.epoch===epoch&&!attempt)publish({phase:'idle',error:error.message});
      throw error;
    }
  }
  async function reopen() {
    const t=attempt;if(!t?.login?.url||state.phase!=='waiting')throw Error('No sign-in browser page is available.');
    requireCurrent(t);
    try {await openExternal(url(t.login.url));if(current(t))publish({error:''});}
    catch(error){if(current(t))publish({error:error.message});throw error;}
    return state;
  }
  // The one-time code a provider's sign-in page shows (a login with acceptsCode): sent to the pending sign-in; its
  // account/login/completed finishes it like the browser callback would.
  async function submitCode(code) {
    const t=attempt;
    if(!t?.login?.acceptsCode||state.phase!=='waiting')throw Error('No sign-in is waiting for a code.');
    if(typeof code!=='string'||!code.trim()||code.length>8192)throw Error('Paste the code from the browser.');
    requireCurrent(t);publish({error:''});
    try{await t.owner.request('codeDesktop/login/code',{loginId:t.login.loginId,code:code.trim()});return state;}
    catch(error){if(current(t))publish({error:error.message});throw error;}
  }
  async function logout(confirmed) {
    if(confirmed!==true)throw Error('Confirm sign out first.');
    if(state.phase!=='idle'||attempt)throw Error('Finish or cancel the current account operation first.');
    const owner=getClient(),generation=epoch;readRevision++;publish({phase:'signingOut',error:'',notice:''});
    try {
      await owner.start();if(owner!==getClient()||generation!==epoch)throw coreError(owner,'The {core} connection changed. Try again.');
      const result=await owner.request('account/logout',{});
      if(owner!==getClient()||generation!==epoch)return state;
      // codeDesktop.notice: what signing out here left signed in (OpenCode 2.x: Claude Code's own `claude auth logout`).
      const notice=typeof result?.codeDesktop?.notice==='string'?result.codeDesktop.notice.slice(0,500):'';
      // The logout succeeded, but an environment-provided credential may remain.
      // Invalidate the old snapshot; only account/read determines the new identity.
      accountChanged(null);await refresh(owner);
      if(owner===getClient()&&generation===epoch)publish({phase:'idle',login:null,error:'',notice});
      return state;
    }catch(error){if(owner===getClient()&&generation===epoch)publish({phase:'idle',error:error.message});throw error;}
  }
  function observe(event) {
    if(event.kind==='connection'&&!event.connected){epoch++;readRevision++;attempt=null;accountSnapshot=null;publish({phase:'idle',login:null,error:''});return;}
    if(event.method==='account/updated'){
      const owner=getClient(),generation=epoch;
      void refresh(owner).catch(error=>{if(owner===getClient()&&generation===epoch)publish({error:error.message});});return;
    }
    if(event.method!=='account/login/completed')return;
    const t=attempt,p=event.params||{};if(!t||!current(t)||typeof p.loginId!=='string')return;
    if(!t.login){t.early.set(p.loginId,p);if(t.early.size>16)t.early.delete(t.early.keys().next().value);return;}
    if(p.loginId!==t.login.loginId)return;
    if(state.phase==='cancelling'){t.completion=p;return;}
    void finish(t,p);
  }
  async function refreshAction(){
    if(state.phase!=='idle')throw Error('Finish or cancel the current account operation first.');
    const owner=getClient(),generation=epoch;publish({phase:'refreshing',error:''});
    try{const result=await refresh(owner);if(owner===getClient()&&generation===epoch)publish({phase:'idle',error:''});return result;}
    catch(error){if(owner===getClient()&&generation===epoch)publish({phase:'idle',error:error.message});throw error;}
  }
  return {snapshot:()=>state,accountSnapshot:()=>accountSnapshot,observe,start,cancel,reopen,logout,refresh,
    run(p={}){if(p.operation==='cancel')return cancel();if(p.operation==='code')return submitCode(p.code);if(p.operation==='open')return reopen();if(p.operation==='logout')return logout(p.confirmed);if(p.operation==='refresh')return refreshAction();throw Error('Unsupported account operation.');}};
}
// A per-token account: signed in with an API key (Codex account.type "apiKey"), Codex's managed Amazon Bedrock login
// ("amazonBedrock": AWS bills and limits it, tui status/card.rs), or a custom endpoint that needs no sign-in
// (requiresOpenaiAuth false, no account). Its provider bills per token: there are no plan limits to read.
function perTokenAccount(account){
  if(!account||typeof account!=='object')return false;
  return account.account?.type==='apiKey'||account.account?.type==='amazonBedrock'||(!account.account&&account.requiresOpenaiAuth===false);
}
// The empty, valid answers to a per-token account's refused account/rateLimits/read and account/usage/read (Codex
// 0.155.1 GetAccountRateLimitsResponse / GetAccountTokenUsageResponse; Codex answers "chatgpt authentication
// required"), marked codeDesktop.perTokenBilling: the Usage page shows its empty state instead of the raw refusal.
function perTokenUsage(method,account){
  if(!perTokenAccount(account))return null;
  if(method==='account/rateLimits/read')return {ordinaryUsageAllowed:null,rateLimits:null,rateLimitsByLimitId:null,rateLimitResetCredits:null,accountId:null,rateLimitUpsell:null,codeDesktop:{perTokenBilling:true}};
  if(method==='account/usage/read')return {summary:{lifetimeTokens:null,peakDailyTokens:null,longestRunningTurnSec:null,currentStreakDays:null,longestStreakDays:null},dailyUsageBuckets:null,codeDesktop:{perTokenBilling:true}};
  return null;
}
// The empty answer for a refusal a per-token account gets only from a core with no plan usage to read: a native core
// (Codex, or a native Extension Pack speaking its protocol) that doesn't meter usage itself (no perTokenBilling
// capability), refusing with Codex's invalid-request "… authentication required to read …" (account_processor.rs:
// "chatgpt authentication required to read rate limits" for an API key, "codex account authentication required …"
// for no auth). Any other error, and every bridge or built-in core's error (a DeepSeek log scan that fails, bad
// prices), stays an error the Usage page shows.
function perTokenRefusal(method,error,{serverInfo,account}={}){
  if(error?.code!==-32600||!/\bauthentication required\b/i.test(String(error?.message??'')))return null;
  if(coreForEngine(serverInfo?.engine).kind!=='native'||coreSupports(serverInfo,'perTokenBilling'))return null;
  return perTokenUsage(method,account);
}
module.exports={createAccountOperations,perTokenAccount,perTokenUsage,perTokenRefusal};
