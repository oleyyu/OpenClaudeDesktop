import test from 'node:test';
import assert from 'node:assert/strict';
import {USAGE_DAILY_DAYS,usageEmptyText,usagePresentation,usageVariant,usageResetLabel,creditDisplay,creditCount,resetCreditsPresentation,usageLimitNotice,planUsageSummary,planWindowSummary,usageResetCountdown,mergeRateLimits,planLabel} from '../src/usage-model.mjs';
import {accountTokenUsage} from '../../harness/packages/codex-app-server/src/usage.js';
const window=(usedPercent,windowDurationMins=300)=>({usedPercent,windowDurationMins,resetsAt:1790035200});
test('usage prefers named buckets and displays used amounts, actual plan and extra model names',()=>{
 const p=usagePresentation({account:{account:{planType:'pro'}},limits:{rateLimits:{primary:window(99)},rateLimitsByLimitId:{codex:{primary:window(3),secondary:window(53,10080)},model:{limitName:'Fast model',secondary:window(95,10080)}}}});
 assert.equal(p.plan,'Pro');assert.deepEqual(p.rows.map(r=>[r.label,r.used,r.variant]),[['Current session',3,'accent'],['This week',53,'accent'],['Fast model · This week',95,'danger']]);
});
test('usage handles absent, null, nonfinite and zero honestly with legacy fallback',()=>{
 assert.deepEqual(usagePresentation(null),{rows:[],credits:[],spending:[],resetCredits:null,notice:null,plan:null,daily:[],dailyLabel:'Last 30 days',lifetimeTokens:null});
 for(const used of [null,undefined,NaN,Infinity,'20'])assert.equal(usagePresentation({limits:{rateLimits:{primary:window(used)}}}).rows.length,0);
 assert.equal(usagePresentation({limits:{rateLimitsByLimitId:{},rateLimits:{primary:window(0)}}}).rows[0].used,0);
 assert.equal(usagePresentation({limits:{rateLimits:{primary:window(110)}}}).rows[0].used,100);
 assert.equal(usagePresentation({limits:{rateLimits:{primary:window(-5)}}}).rows[0].used,0);
});
test('source meter warning thresholds are 75 and 90; unknown durations are not mislabeled',()=>{
 assert.deepEqual([74,75,89,90,95].map(usageVariant),['accent','warning','warning','danger','danger']);
 for(const [duration,label] of [[null,'Primary limit'],[60,'1-hour limit'],[1440,'1-day limit'],[30,'30-minute limit']])assert.equal(usagePresentation({limits:{rateLimits:{primary:window(5,duration)}}}).rows[0].label,label);
});
test('credit balance follows Codex /status: counts, Available, Unlimited and an explicit no-credits state',()=>{
 const p=usagePresentation({limits:{rateLimitsByLimitId:{codex:{credits:{balance:'0',hasCredits:false,unlimited:false},individualLimit:{limit:'500',used:'3',remainingPercent:99,resetsAt:1790035200}},extra:{credits:{balance:null,hasCredits:true,unlimited:false}},third:{credits:{unlimited:true}}}}},{locale:'en-US'});
 assert.deepEqual(p.credits.map(c=>[c.balance,c.state]),[['No credits','none'],['Available','available'],['Unlimited','unlimited']]);
 // Codex's monthly credit limit row: used = 100 - remainingPercent, '{used} of {limit} credits used', the reset kept.
 assert.deepEqual(p.spending.map(s=>[s.limit,s.percent,s.detail,s.resetsAt,s.variant]),[['500',1,'3 of 500 credits used',1790035200,'accent']]);
 assert.equal(usagePresentation({limits:{rateLimits:{credits:{balance:null}}}}).credits.length,0);
 // format_credit_balance: whole and decimal balances round; zero/negative/non-numeric are not counts.
 assert.deepEqual(['1250','1250.6',' 7 ','0','-3','abc','',null].map(creditCount),[1250,1251,7,null,null,null,null,null]);
 assert.deepEqual(creditDisplay({hasCredits:true,unlimited:false,balance:'1250.4'},'en-US'),{value:'1,250 credits',state:'balance',count:1250});
 assert.equal(creditDisplay({hasCredits:true,unlimited:false,balance:'1'},'en-US').value,'1 credit');
 assert.equal(creditDisplay({hasCredits:true,unlimited:false,balance:'0'}).value,'Available');
 assert.equal(creditDisplay({balance:'120'}).value,'120 credits','a legacy snapshot without hasCredits keeps its balance');
 assert.equal(creditDisplay({balance:'lots'}).value,'lots');assert.equal(creditDisplay(null),null);
 // An unparseable spend amount keeps its text and has no meter.
 const odd=usagePresentation({limits:{rateLimits:{individualLimit:{limit:'n/a',used:'x',remainingPercent:null,resetsAt:null}}}});
 assert.deepEqual(odd.spending.map(s=>[s.detail,s.percent]),[['x of n/a credits used',null]]);
});
test('earned usage-limit resets: Codex reset_credit_options order, cap and defaults',()=>{
 assert.equal(resetCreditsPresentation(null),null);assert.equal(resetCreditsPresentation({availableCount:'x'}),null);
 assert.deepEqual(resetCreditsPresentation({availableCount:0,credits:[]}),{available:0,options:[]});
 assert.deepEqual(resetCreditsPresentation({availableCount:2,credits:null}).options,[{creditId:null,title:'Full reset',detail:null,description:'Reset your current usage limits.'}],'count without details: one backend-picked reset');
 const r=resetCreditsPresentation({availableCount:2,credits:[
  {id:'late',status:'available',expiresAt:1800000000,title:'Weekly bonus',description:'Clears your weekly limit.',resetType:'codexRateLimits',grantedAt:1},
  {id:'never',status:'available',expiresAt:null,title:null,description:'  ',resetType:'codexRateLimits',grantedAt:1},
  {id:'soon',status:'available',expiresAt:1790000000,title:'  ',description:null,resetType:'codexRateLimits',grantedAt:1},
  {id:'used',status:'redeemed',expiresAt:1,title:'x',description:'x',resetType:'codexRateLimits',grantedAt:1}]},'en-US');
 assert.equal(r.available,2);assert.deepEqual(r.options.map(o=>[o.creditId,o.title,o.description]),[['soon','Full reset','Reset your current usage limits.'],['late','Weekly bonus','Clears your weekly limit.']],'soonest first, capped at availableCount, redeemed left out');
 assert.match(r.options[0].detail,/^Expires /);
 assert.equal(resetCreditsPresentation({availableCount:1,credits:[{id:'n',status:'available',expiresAt:null}]}).options[0].detail,'Does not expire');
});
test('limit notices: reached types, spend control and ordinary usage, with their remedies',()=>{
 const snap=extra=>({rateLimitsByLimitId:{codex:{primary:window(100),...extra}}});
 assert.equal(usageLimitNotice(snap({})),null);
 const owner=usageLimitNotice(snap({rateLimitReachedType:'workspace_owner_credits_depleted'}),'Codex');
 assert.deepEqual([owner.title,owner.body,owner.nudge,owner.tone],['You’re out of credits','Your workspace is out of credits. Add credits to continue using Codex.',null,'danger']);
 assert.equal(usageLimitNotice(snap({rateLimitReachedType:'workspace_member_credits_depleted'})).nudge,'credits');
 assert.equal(usageLimitNotice(snap({rateLimitReachedType:'workspace_member_usage_limit_reached'})).nudge,'usage_limit');
 assert.equal(usageLimitNotice(snap({rateLimitReachedType:'workspace_owner_usage_limit_reached'})).nudge,null);
 const plain=usageLimitNotice(snap({rateLimitReachedType:'rate_limit_reached'}));assert.equal(plain.reset,false);assert.match(plain.body,/Try again after your limit resets/);
 const withReset=usageLimitNotice({...snap({rateLimitReachedType:'rate_limit_reached'}),rateLimitResetCredits:{availableCount:1,credits:null}});assert.equal(withReset.reset,true);assert.match(withReset.body,/earned reset/);
 assert.equal(usageLimitNotice(snap({spendControlReached:true})).kind,'spend_control_reached');
 assert.equal(usageLimitNotice({...snap({credits:{hasCredits:true,unlimited:false,balance:'5'}}),ordinaryUsageAllowed:false}).kind,'credits_in_use');
 assert.equal(usageLimitNotice({...snap({credits:{hasCredits:false,unlimited:false,balance:'0'}}),ordinaryUsageAllowed:false}).kind,'ordinary_usage_blocked');
 assert.equal(usageLimitNotice({...snap({}),ordinaryUsageAllowed:null}),null,'null ordinaryUsageAllowed is unavailable, not blocked');
 // The notice and resets ride on usagePresentation, and every PlanType has a product name.
 const p=usagePresentation({limits:{...snap({rateLimitReachedType:'rate_limit_reached'}),rateLimitResetCredits:{availableCount:3,credits:null}}});
 assert.equal(p.notice.kind,'rate_limit_reached');assert.equal(p.resetCredits.available,3);
 for(const [raw,label] of [['self_serve_business_usage_based','Business'],['enterprise_cbp_automation','Enterprise'],['ent26','Enterprise'],['prolite','Pro Lite'],['unknown',null],['new_tier','new tier']])assert.equal(planLabel(raw),label);
});
test('composer plan usage: fullest base window, hd tooltip copy, countdown and sparse rolling merges',()=>{
 const limits={rateLimitsByLimitId:{codex:{planType:'plus',primary:window(45),secondary:window(80,10080),credits:{hasCredits:true,unlimited:false,balance:'12'}},model:{limitName:'Fast',primary:window(99)}}};
 const summary=planUsageSummary(limits);
 assert.equal(summary.top.label,'This week','the separate model limit never names the ring');assert.equal(summary.plan,'Plus');assert.equal(summary.credit.balance,'12 credits');
 assert.equal(planWindowSummary(summary.windows[0]),'45% of 5-hour limit');assert.equal(planWindowSummary(summary.top),'This week: 80%');assert.equal(planWindowSummary(null),null);
 const now=Date.UTC(2026,9,5,12,0,0)/1000;
 assert.equal(usageResetCountdown(now+59*60,300,{now:now*1000}),'Resets in 59 min');
 assert.equal(usageResetCountdown(now+125*60,300,{now:now*1000}),'Resets in 2 hr 5 min');
 // shared-156 lU: a passed reset is no label (3.6556.2 has no 'Resets soon'); a day or more out is cU 'Resets {time}'.
 assert.equal(usageResetCountdown(now-5,300,{now:now*1000}),null);
 assert.match(usageResetCountdown(now+3*86400,10080,{now:now*1000,locale:'en-US'}),/^Resets (Mon|Tue|Wed|Thu|Fri|Sat|Sun) /);assert.equal(usageResetCountdown(null,300),null);
 assert.match(usageResetCountdown(now+8*86400,10080,{now:now*1000,locale:'en-US'}),/^Resets (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+, /);
 // AccountRateLimitsUpdatedNotification: windows replace, null metadata keeps what was seen, other buckets stay.
 const merged=mergeRateLimits(limits,{limitId:'codex',limitName:null,normalModelSlug:null,primary:window(60),secondary:null,credits:null,individualLimit:null,spendControlReached:null,planType:null,rateLimitReachedType:'rate_limit_reached'});
 assert.equal(merged.rateLimitsByLimitId.codex.primary.usedPercent,60);assert.equal(merged.rateLimitsByLimitId.codex.secondary.usedPercent,80);
 assert.equal(merged.rateLimitsByLimitId.codex.credits.balance,'12');assert.equal(merged.rateLimitsByLimitId.codex.planType,'plus');assert.equal(merged.rateLimitsByLimitId.model.primary.usedPercent,99);
 assert.equal(planUsageSummary(merged).notice.kind,'rate_limit_reached');
 const fresh=mergeRateLimits(null,{limitId:null,primary:window(10)});assert.equal(planUsageSummary(fresh).windows[0].used,10,'a first rolling update stands alone');
 assert.equal(mergeRateLimits(limits,null),limits);
});
test('usage preserves text as data and ignores malformed daily buckets without treating failure as zero',()=>{
 const p=usagePresentation({account:{account:{planType:'<img onerror=alert(1)>'}},tokenUsage:{dailyUsageBuckets:[null,{startDate:'2026-09-22',tokens:0},{startDate:'bad',tokens:null},{startDate:'<b>x</b>',tokens:1234}]}});
 assert.equal(p.plan,'<img onerror=alert(1)>');assert.deepEqual(p.daily.map(d=>[d.startDate,d.tokens]),[['<b>x</b>',1234],['2026-09-22',0]],'kept as data, sorted newest (greatest key) first');assert.deepEqual(usagePresentation({tokenUsage:{dailyUsageBuckets:{bad:true}}}).daily,[]);
});
test('reset labels follow shared-156 fU: same day, weekday, a week out; missing, out-of-range or passed dates omitted',()=>{
 const now=new Date(2026,9,5,9,0,0).getTime(),at=(d,h,m=0)=>new Date(2026,9,5+d,h,m).getTime()/1000;
 for(const v of [null,undefined,'12',Infinity,1e30])assert.equal(usageResetLabel(v,300,'en-US',now),null);
 assert.equal(usageResetLabel(at(0,8),300,'en-US',now),null,'a passed reset has no label');
 assert.equal(usageResetLabel(at(0,14,30),300,'en-US',now),'Resets at 2:30 PM');
 assert.equal(usageResetLabel(at(2,14,30),10080,'en-US',now),'Resets Wed 2:30 PM','the window length no longer picks the copy');
 assert.equal(usageResetLabel(at(9,14,30),300,'en-US',now),'Resets Oct 14, 2:30 PM');
});
test('DeepSeek core: per-token billing copy instead of unavailable limits, and the bridge daily table',()=>{
 assert.equal(usageEmptyText('deepseek'),'Usage on DeepSeek Harness is billed per token by your provider; there are no plan usage limits.');
 assert.equal(usageEmptyText('deepseek-harness'),'Usage on DeepSeek Harness is billed per token by your provider; there are no plan usage limits.');
 for(const engine of ['codex',undefined])assert.equal(usageEmptyText(engine),'Usage limits are unavailable for this account or connection.');
 // The bridge's all-null rateLimits plus its folded token usage.
 const empty={limitId:null,limitName:null,primary:null,secondary:null,credits:null,individualLimit:null,spendControlReached:null,planType:null,rateLimitReachedType:null};
 const p=usagePresentation({limits:{rateLimits:empty,rateLimitsByLimitId:null},tokenUsage:accountTokenUsage([{days:{'2026-09-30':271,'2026-10-01':1200},longestTurnSec:30}],'2026-10-01')});
 assert.deepEqual(p.rows,[]);assert.deepEqual(p.credits,[]);assert.equal(p.plan,null);
 assert.deepEqual(p.daily,[{startDate:'2026-10-01',tokens:1200},{startDate:'2026-09-30',tokens:271}],'newest first');
 assert.equal(p.lifetimeTokens,1471);assert.equal(p.dailyLabel,'Last 30 days');
});
// R02: the harness reports every active day ascending since the first session; the page shows the last 30
// calendar days ending today (the home card's 30d range), newest first, capped at 30 rows, plus the
// all-time summary.lifetimeTokens.
const key=(base,offset)=>{const [y,m,d]=base.split('-').map(Number),date=new Date(y,m-1,d-offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
test('daily table: newest first, the last 30 days ending today, at most 30 rows, lifetime total kept',()=>{
 const today='2026-10-01',days={};for(let offset=0;offset<90;offset++)days[key(today,offset)]=offset+1;
 const tokenUsage=accountTokenUsage([{days,longestTurnSec:5}],today);
 assert.deepEqual(tokenUsage.dailyUsageBuckets.slice(0,2).map(b=>b.startDate),[key(today,89),key(today,88)],'precondition: the harness sorts ascending');
 const p=usagePresentation({tokenUsage},{todayKey:today});
 assert.equal(USAGE_DAILY_DAYS,30);assert.equal(p.daily.length,30);
 assert.deepEqual(p.daily.slice(0,3).map(b=>[b.startDate,b.tokens]),[[today,1],['2026-09-30',2],['2026-09-29',3]]);
 assert.equal(p.daily.at(-1).startDate,'2026-09-02','today minus 29 days is the oldest row');
 assert.equal(p.lifetimeTokens,90*91/2,'the total is the all-time summary, not the visible rows');
 // Sparse history: older days never pose as 'Last 30 days'; without todayKey only the cap applies.
 const sparse={dailyUsageBuckets:[{startDate:'2026-06-01',tokens:5},{startDate:'2026-09-20',tokens:7},{startDate:'2026-10-01',tokens:9}],summary:{lifetimeTokens:21}};
 assert.deepEqual(usagePresentation({tokenUsage:sparse},{todayKey:today}).daily.map(b=>b.startDate),['2026-10-01','2026-09-20']);
 assert.deepEqual(usagePresentation({tokenUsage:sparse}).daily.map(b=>b.startDate),['2026-10-01','2026-09-20','2026-06-01']);
 assert.equal(usagePresentation({tokenUsage:{...tokenUsage}}).daily.length,30,'cap without a clock');
 for(const lifetimeTokens of [undefined,null,-1,NaN,'12'])assert.equal(usagePresentation({tokenUsage:{dailyUsageBuckets:[],summary:{lifetimeTokens}}}).lifetimeTokens,null);
 assert.equal(usagePresentation({tokenUsage:{dailyUsageBuckets:[],summary:{lifetimeTokens:0}}}).lifetimeTokens,0);
 // Month boundaries use calendar days (2026-03-01 minus 29 days is 2026-01-31).
 assert.deepEqual(usagePresentation({tokenUsage:{dailyUsageBuckets:[{startDate:'2026-01-30',tokens:1},{startDate:'2026-01-31',tokens:2}]}},{todayKey:'2026-03-01'}).daily.map(b=>b.startDate),['2026-01-31']);
});
test('Usage page source: formatted dates and counts, Last updated beside Refresh, catalog loading copy',async()=>{
 const fs=await import('node:fs/promises');const path=await import('node:path');
 const app=path.resolve(import.meta.dirname,'..');
 const page=await fs.readFile(path.join(app,'src/source-usage.jsx'),'utf8');
 // The app's locale, never the system one (a zh-CN UI on an English Mac shows '10月5日', not 'Oct 5').
 assert.match(page,/const dayCell=key=>\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(key\)\?formatDayKey\(key,getLocale\(\)\):key;/);
 assert.match(page,/const tokenCount=value=>new Intl\.NumberFormat\(getLocale\(\)\)\.format\(value\);/);
 assert.match(page,/const todayKey=localDayKey\(new Date\(\)\);/);assert.match(page,/usagePresentation\(data,\{todayKey,core:coreName\(engine\),locale:getLocale\(\)\}\)/);
 // DeepSeek core: the estimated-cost layout replaces the limits copy and the token table only when the bridge sent `deepseek`.
 assert.match(page,/const cost=usageCostPresentation\(data,\{todayKey,locale:getLocale\(\),days:range\}\),spend=cost\?null:usageSpendPresentation\(data\);/);assert.match(page,/\{!cost&&daily\.length>0&&<section/);
 // Every string the page shows goes through t(): the empty-limits copy comes translated from usageEmptyText.
 assert.match(page,/<p className="su-empty">\{usageEmptyText\(engine\)\}<\/p>/);
 // The daily table heading is translated too (usagePresentation returns the English source).
 assert.match(page,/<h3 className="text-heading-semibold">\{t\(dailyLabel\)\}<\/h3>/);assert.doesNotMatch(page,/DeepSeekUsage|formatCny/);
 assert.match(page,/<td>\{dayCell\(bucket\.startDate\)\}<\/td><td>\{tokenCount\(bucket\.tokens\)\}<\/td>/);
 assert.match(page,/<tfoot><tr><th scope="row">\{t\('All time'\)\}<\/th><td>\{tokenCount\(lifetimeTokens\)\}<\/td><\/tr><\/tfoot>/);
 assert.match(page,/<span className="su-updated">\{t\('Last updated:'\)\} <SourceTimestamp dateMs=\{updatedAt\}\/><\/span>/);
 assert.doesNotMatch(page,/Loading usage limits…|toLocaleString\(\)<\/td>|<td>\{bucket\.startDate\}<\/td>/);
 assert.match(page,/<span>\{t\('Loading usage limits'\)\}<\/span>/);
 const actions=await fs.readFile(path.join(app,'src/source-session-actions.jsx'),'utf8');
 assert.match(actions,/<p role="status">\{t\("Loading usage limits"\)\}<\/p>/);assert.doesNotMatch(actions,/Loading usage limits…/);
 const css=await fs.readFile(path.join(app,'src/source-usage.css'),'utf8');
 assert.match(css,/\.su-footer>\.su-updated\{color:var\(--cds-text-muted\)\}/);
 const {formatDayKey}=await import('../src/home-model.mjs');
 assert.equal(formatDayKey('2026-09-30','en-US'),'Sep 30','UTC keeps the key day in any zone');
});

// Audit 12/23/37/66: the empty-limits copy names the running core (its reported capabilities win) and is translated;
// per-limit labels and descriptions are translated too.
test('usage copy is core-neutral and translated',async()=>{
 const {setAssistantName,setLocale}=await import('../electron/i18n/index.mjs');
 try{
  for(const [core,name] of [['opencode','OpenCode'],['mimo','MiMo Code'],[{engine:'zcode',capabilities:{perTokenBilling:true}},'ZCode']])
   assert.equal(usageEmptyText(core),`Usage on ${name} is billed per token by your provider; there are no plan usage limits.`,name);
  for(const core of ['zcode',{engine:'zcode'},{engine:'zcode',capabilities:{perTokenBilling:false}},'kimi'])assert.equal(usageEmptyText(core),'Usage limits are unavailable for this account or connection.');
  setAssistantName('Codex');
  for(const core of ['opencode','mimo','deepseek',{engine:'zcode',capabilities:{perTokenBilling:true}}])assert.doesNotMatch(usageEmptyText(core).replace('DeepSeek Harness',''),/DeepSeek/);
  setLocale('zh-CN');
  assert.equal(usageEmptyText('codex'),'此账户或连接无法获取用量限制。');
  assert.match(usageEmptyText('opencode'),/OpenCode/);assert.doesNotMatch(usageEmptyText('opencode'),/billed|DeepSeek/);
  const p=usagePresentation({limits:{rateLimitsByLimitId:{codex:{primary:window(3)},model:{limitName:'Fast model',secondary:window(95,1440)},extra:{credits:{unlimited:true}}}}});
  assert.deepEqual(p.rows.map(r=>[r.label,r.description]),[['当前会话',null],['Fast model · 1 天限额','Fast model 的单独用量限额']]);
  assert.deepEqual(p.credits.map(c=>c.balance),['无限']);
  assert.match(usageResetLabel(1790035200,300,'zh-CN',1790035200*1000-3600e3),/^.+ 重置$/);assert.match(usageResetLabel(1790035200,300,'zh-CN',1790035200*1000-3*86400e3),/^.+ 重置$/);
  assert.equal(creditDisplay({hasCredits:true,unlimited:false,balance:'1250'},'en-US').value,'1,250 额度');
  assert.equal(usageLimitNotice({rateLimits:{rateLimitReachedType:'workspace_owner_credits_depleted'}},'Codex').body,'你的工作区额度已用完。添加额度后才能继续使用 Codex。');
  assert.equal(planWindowSummary({used:45,minutes:300,label:'当前会话'}),'已用 5 小时限额的 45%');
  assert.equal(resetCreditsPresentation({availableCount:1,credits:null}).options[0].title,'完全重置');
 }finally{setLocale('en-US');setAssistantName('DeepSeek');}
});
