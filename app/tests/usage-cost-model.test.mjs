import test from 'node:test';
import assert from 'node:assert/strict';
import {COST_FOOTNOTE,DEEPSEEK_USAGE_URL,usageCostPresentation} from '../src/usage-cost-model.mjs';
// W14-code r4 closeout R4DC-N7: the test-only formatCny and the deepseekCostPresentation alias are gone.
const deepseekCostPresentation=usageCostPresentation;
import {accountTokenUsage,foldSession} from '../../harness/packages/codex-app-server/src/usage.js';
// Local wall-clock times like the harness fold; the price tier is the same instant's Beijing time.
const at=(day,hour)=>new Date(2026,8,day,hour).getTime();
const reply=(time,model,usage)=>({type:'assistant/message',time,data:{turn:1,step:0,message:{role:'assistant',content:'ok',source:{model}},stream:[],usage}});
test('the cost footnote names the official prices and the platform bill',()=>{
 assert.match(COST_FOOTNOTE,/official peak and off-peak prices.*DeepSeek Platform bill/);
});
test('the bridge deepseek field becomes tiles, cost categories, models and newest-first days within 30 days',()=>{
 const sessions=[foldSession([
  reply(at(30,10),'deepseek-v4-flash',{inputTokens:600000,outputTokens:300000,cacheReadTokens:66500}),
  reply(at(29,22),'deepseek-v4-pro',{inputTokens:100000,outputTokens:50000,cacheWriteTokens:1000}),
  reply(at(10,9),'deepseek-flash',{inputTokens:1000,outputTokens:1000}),
  reply(at(1,9)-60*864e5,'deepseek-flash',{inputTokens:5,outputTokens:5}),
  reply(at(29,23),'mystery',{inputTokens:10,outputTokens:0}),
 ])];
 const tokenUsage=accountTokenUsage(sessions,'2026-09-30');
 const cost=deepseekCostPresentation({tokenUsage,account:{deepseek:{links:{usageUrl:'https://platform.deepseek.com/usage?x=1'}}}},{todayKey:'2026-09-30',locale:'en-US'});
 assert.deepEqual(cost.tiles.map(t=>[t.key,t.label,t.tokens]),[['all','Total tokens',1119520],['30d','Last 30 days',1119510],['today','Today',966500]]);
 assert.equal(cost.tiles[2].cost,tokenUsage.deepseek.today.costCny);assert.ok(cost.tiles[2].cost>0);
 assert.equal(cost.tiles[0].partial,true,'an unpriced model makes the all-time cost partial');assert.equal(cost.partial,true);
 assert.deepEqual(cost.categories.map(c=>[c.key,c.label,c.tokens]),[['input','Input',702015],['cached','Cached input',66500],['output','Output',351005]],'cache writes bill as input');
 assert.equal(cost.categoryBasis,'cost');assert.ok(Math.abs(cost.categories.reduce((s,c)=>s+c.share,0)-1)<1e-9);
 assert.deepEqual(cost.models.map(m=>[m.name,m.tokens,m.share===1]),[['4.1 Flash',968510,true],['4 Pro',151000,false],['mystery',10,false]]);
 assert.equal(cost.models[2].cost,null);
 assert.deepEqual(cost.daily.map(d=>[d.date,d.label]),[['2026-09-30','Sep 30'],['2026-09-29','Sep 29'],['2026-09-10','Sep 10']],'newest first; the 60-days-old day is left out');
 assert.equal(cost.daily[0].share,1);assert.equal(cost.usageUrl,'https://platform.deepseek.com/usage?x=1');
 // Only the DeepSeek platform is linked.
 assert.equal(deepseekCostPresentation({tokenUsage,account:{deepseek:{links:{usageUrl:'https://evil.example/usage'}}}},{todayKey:'2026-09-30'}).usageUrl,DEEPSEEK_USAGE_URL);
});
test('no deepseek field (Codex core, fixtures) or a malformed one keeps the Codex layout; nothing used is zeros',()=>{
 for(const data of [null,{},{tokenUsage:{summary:{lifetimeTokens:5},dailyUsageBuckets:[]}},{tokenUsage:{deepseek:[]}},{tokenUsage:{deepseek:{allTime:{}}}}])assert.equal(deepseekCostPresentation(data,{todayKey:'2026-09-30'}),null);
 const empty=deepseekCostPresentation({tokenUsage:accountTokenUsage([],'2026-09-30')},{todayKey:'2026-09-30'});
 assert.deepEqual(empty.tiles.map(t=>[t.tokens,t.cost,t.partial]),[[0,0,false],[0,0,false],[0,0,false]]);
 assert.deepEqual([empty.models,empty.daily,empty.categoryBasis],[[],[],'tokens']);
 // Garbage rows never render.
 const junk=deepseekCostPresentation({tokenUsage:{deepseek:{allTime:{tokens:5},last30Days:{},today:{},models:[null,{model:'m',tokens:-1}],daily:[{date:'bad',tokens:5},{date:'2026-09-30',tokens:'5'}]}}},{todayKey:'2026-09-30'});
 assert.deepEqual([junk.models,junk.daily],[[],[]]);assert.equal(junk.tiles[0].cost,null);
});
test('custom prices from Settings › Models switch the footnote source (C5 review)',async()=>{
 const {CUSTOM_COST_FOOTNOTE}=await import('../src/usage-cost-model.mjs');
 const sessions=[foldSession([reply(at(30,10),'deepseek-v4-flash',{inputTokens:1000,outputTokens:1000})])];
 const official=deepseekCostPresentation({tokenUsage:accountTokenUsage(sessions,'2026-09-30')},{todayKey:'2026-09-30'});
 assert.equal(official.customPrices,false);
 const custom=deepseekCostPresentation({tokenUsage:{deepseek:{...accountTokenUsage(sessions,'2026-09-30').deepseek,customPrices:true}}},{todayKey:'2026-09-30'});
 assert.equal(custom.customPrices,true);
 assert.match(CUSTOM_COST_FOOTNOTE,/Settings › Models/);assert.doesNotMatch(CUSTOM_COST_FOOTNOTE,/official/);
});
// Audit 42/51: the cost view reads any core's breakdown generically, in the source's currency, and a bare spend
// (opencode-bridge `opencode: {costUsd}`) is no longer dropped.
test('a core-neutral breakdown (ACP bridge) renders tokens only when it carries no prices',async()=>{
 const {usageCostPresentation}=await import('../src/usage-cost-model.mjs');
 const sum={tokens:1500,inputTokens:1000,cacheReadTokens:200,cacheWriteTokens:0,outputTokens:300,unpricedTokens:1500,costCny:null};
 const breakdown={allTime:sum,last30Days:sum,today:sum,models:[{model:'qwen3-coder',displayName:'qwen3-coder',tokens:1500,costCny:null}],daily:[{date:'2026-09-30',tokens:1500,costCny:null}],priced:false};
 const cost=usageCostPresentation({tokenUsage:{summary:{lifetimeTokens:1500},dailyUsageBuckets:[],breakdown}},{todayKey:'2026-09-30',locale:'en-US'});
 assert.equal(cost.source,'breakdown');assert.equal(cost.priced,false);assert.equal(cost.usageUrl,null);assert.equal(cost.partial,false,'unpriced is not partial');
 assert.deepEqual(cost.tiles.map(t=>[t.key,t.tokens,t.cost]),[['all',1500,null],['30d',1500,null],['today',1500,null]]);
 assert.equal(cost.categoryBasis,'tokens');assert.deepEqual(cost.models.map(m=>m.name),['qwen3-coder']);assert.deepEqual(cost.daily.map(d=>d.date),['2026-09-30']);
});
test('USD costs from any source keep their currency; a bare all-time spend is read generically',async()=>{
 const {usageCostPresentation,usageSpendPresentation,formatMoney}=await import('../src/usage-cost-model.mjs');
 assert.equal(formatMoney(1.5,'USD','en-US'),'$1.50');assert.equal(formatMoney(0.004,'USD','en-US'),'$0.0040');assert.equal(formatMoney(2,'EUR','en-US'),'2.00 EUR');assert.equal(formatMoney(null,'USD'),'—');
 const sum=(tokens,costUsd)=>({tokens,inputTokens:tokens,cacheReadTokens:0,cacheWriteTokens:0,outputTokens:0,unpricedTokens:0,costUsd,inputCostUsd:costUsd,cacheReadCostUsd:0,outputCostUsd:0});
 const breakdown={allTime:sum(100,0.5),last30Days:sum(100,0.5),today:sum(10,0.05),models:[{model:'m',tokens:100,costUsd:0.5}],daily:[{date:'2026-09-30',tokens:100,costUsd:0.5}]};
 const cost=usageCostPresentation({tokenUsage:{breakdown}},{todayKey:'2026-09-30'});
 assert.deepEqual([cost.currency,cost.priced,cost.tiles[0].cost,cost.models[0].cost,cost.daily[0].cost,cost.categoryBasis],['USD',true,0.5,0.5,0.5,'cost']);
 assert.equal(usageCostPresentation({tokenUsage:{breakdown:{...breakdown,currency:'EUR',allTime:{tokens:1,cost:2},last30Days:{tokens:1,cost:2},today:{tokens:0,cost:0}}}}).tiles[0].cost,2);
 // The DeepSeek source keeps CNY, its Platform link and wins over a breakdown.
 const deepseek=usageCostPresentation({tokenUsage:{deepseek:{allTime:{tokens:1,costCny:1},last30Days:{tokens:1,costCny:1},today:{tokens:0,costCny:0}},breakdown}});
 assert.deepEqual([deepseek.source,deepseek.currency,typeof deepseek.usageUrl],['deepseek','CNY','string']);
 // OpenCode / MiMo: account/usage/read carries only `opencode: {costUsd}`.
 const {accountUsage}=await import('../../harness/packages/opencode-bridge/src/usage.js');
 const tokenUsage=accountUsage([{days:{'2026-09-30':{tokens:900,costUsd:0.0123}},longestTurnSec:3}],'2026-09-30');
 assert.equal(usageCostPresentation({tokenUsage}),null,'no breakdown: the limits layout stays');
 assert.deepEqual(usageSpendPresentation({tokenUsage}),{key:'opencode',currency:'USD',allTime:0.0123});
 for(const data of [null,{},{tokenUsage:{summary:{lifetimeTokens:5}}},{tokenUsage:{opencode:{costUsd:null}}},{tokenUsage:{zcode:{totals:{tokens:5}}}},{tokenUsage:{x:{costUsd:-1}}}])
  assert.equal(usageSpendPresentation(data),null,JSON.stringify(data));
 assert.deepEqual(usageSpendPresentation({tokenUsage:{acme:{costCny:3}}}),{key:'acme',currency:'CNY',allTime:3});
});

// B36 (c71860c77-29nOu6oI B/M): the Time range keeps 7, 30 or 90 days of the core's per-day history; costShare
// measures each day against the costliest one for the Cost chart metric; dailyPriced says whether any day has a cost.
test('time range: 7 / 30 / 90 days over the daily history, cost shares and dailyPriced', () => {
 const day=(date,tokens,costUsd)=>({date,tokens,...(costUsd===undefined?{}:{costUsd})});
 const sum={tokens:10,inputTokens:10,cacheReadTokens:0,cacheWriteTokens:0,outputTokens:0,unpricedTokens:0,costUsd:1};
 const breakdown={allTime:sum,last30Days:sum,today:sum,models:[],daily:[day('2026-09-30',100,0.5),day('2026-09-25',300,0.25),day('2026-09-10',50,2),day('2026-07-15',10,1)]};
 const at=days=>usageCostPresentation({tokenUsage:{breakdown}},{todayKey:'2026-09-30',locale:'en-US',days});
 assert.deepEqual(at(7).daily.map(d=>d.date),['2026-09-30','2026-09-25']);assert.equal(at(7).range,7);
 assert.deepEqual(at(30).daily.map(d=>d.date),['2026-09-30','2026-09-25','2026-09-10']);
 assert.deepEqual(at(90).daily.map(d=>d.date),['2026-09-30','2026-09-25','2026-09-10','2026-07-15']);
 assert.equal(at(12).range,30,'an unknown range reads as 30 days');assert.equal(usageCostPresentation({tokenUsage:{breakdown}},{todayKey:'2026-09-30'}).range,30);
 assert.deepEqual(at(30).daily.map(d=>[d.share,d.costShare]),[[1/3,0.25],[1,0.125],[1/6,1]]);
 assert.equal(at(30).dailyPriced,true);
 const unpricedDays={...breakdown,daily:breakdown.daily.map(({costUsd,...rest})=>rest)};
 assert.equal(usageCostPresentation({tokenUsage:{breakdown:unpricedDays}},{todayKey:'2026-09-30',days:30}).dailyPriced,false,'no day with a cost: the Cost metric is off');
});
