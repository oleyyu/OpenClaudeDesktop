import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSessionCommand as parse,matchCommands,rateLimitRows,sessionCommands,commandUnavailable,unsupportedCommand,slashSkills,planCommandAction,slashToken} from '../src/session-command-model.mjs';
import {emptyState,reduce} from '../src/state.js';
// Claude 2.2553.1 cc183b3ab/shared-11: canonical host names, gates and
// completion semantics replace the former Codex TUI palette expectations.
const ready={current:'a',connected:true,hasHistory:true};
test('official aliases and argument errors preserve host routing',()=>{
 for(const [input,id] of [['stats','usage'],['new','clear'],['settings','config'],['name','rename'],['continue','resume'],['bashes','tasks'],['allowed-tools','permissions'],['plugins','plugin']])assert.equal(parse('/'+input).id,id);
 assert.equal(parse('/fork A new path').args,'A new path');
 assert.match(parse('/review first\nthen second').error,/only works on a single line/);
 assert.match(parse('/unknown').error,/isn’t a command here/);assert.match(parse('/status now').error,/doesn’t take arguments here/);assert.equal(parse('/compact keep the API decisions').args,'keep the API decisions');
 assert.equal(parse('/compac').suggestion,'compact');assert.equal(parse('/zzzzzz').suggestion,null);
});
test('catalog contains only executable host actions; unavailable rows disappear',()=>{
 for(const id of ['skills','mcp','plugin'])assert.equal(commandUnavailable(sessionCommands.find(c=>c.id===id),{}),'');
 assert.equal(matchCommands('/market',{})[0].id,'plugin');
 assert.equal(matchCommands('connectors',{}).length,0,'descriptions are not command names');
 assert.equal(matchCommands('status',{}).length,0);
 assert.equal(matchCommands('status',{...ready,running:true}).length,0);
 assert.equal(matchCommands('fast',{...ready,fastAvailable:false}).length,0);
 for(const c of [{}, {...ready,archived:true},{...ready,connected:false},{...ready,running:true},{...ready,pending:true}])assert.ok(commandUnavailable(sessionCommands[0],c));
 assert.equal(commandUnavailable(sessionCommands[0],ready),'');
});
test('paths and prose stay ordinary input; slash multi-line is a command error',()=>{
 for(const text of ['/Users/test/project','//not-a-command','Please /review this','```\n/compact\n```'])assert.equal(parse(text),null);
 assert.match(parse('/status\nnew paragraph').error,/single line/);
});
test('rank is exact name, exact alias, name prefix, alias prefix, substring; spaces close exact commands',()=>{
 assert.equal(matchCommands('/co',ready)[0].id,'compact');assert.equal(matchCommands('/sett',ready)[0].matchedAlias,'settings');
 assert.equal(matchCommands('new',ready)[0].id,'clear');assert.deepEqual(matchCommands('compact ',ready),[]);assert.deepEqual(matchCommands('fork prompt',ready),[]);
 assert.deepEqual(matchCommands('x'.repeat(51),ready),[]);
});
test('rate limits prefer explicit buckets, preserve unknown and zero, clamp invalid ranges',()=>{
 assert.deepEqual(rateLimitRows(null),[]);assert.deepEqual(rateLimitRows({rateLimits:{primary:null}}),[]);
 const rows=rateLimitRows({rateLimits:{primary:{usedPercent:99}},rateLimitsByLimitId:{codex:{limitName:'Codex',primary:{usedPercent:0,windowDurationMins:300,resetsAt:123},secondary:{usedPercent:140,windowDurationMins:10080,resetsAt:null}}}});
 assert.equal(rows[0].remaining,100);assert.equal(rows[0].label,'Codex · 5 hours');assert.equal(rows[1].remaining,0);assert.equal(rows[1].resetsAt,null);
});
test('operation events belong to current connection; real compaction start stays busy and failed turn cannot appear successful',()=>{
 let state={...emptyState,approvalConnectionId:'c',approvalConnectionEpoch:1};
 state=reduce(state,{event:{kind:'session-operation',threadId:'a',operation:'compact',phase:'running',connectionId:'old',connectionEpoch:1}});assert.equal(state.operations.a,undefined);
 state=reduce(state,{event:{kind:'session-operation',threadId:'a',operation:'compact',phase:'running',connectionId:'c',connectionEpoch:1}});assert.equal(state.operations.a.phase,'running');
 state=reduce(state,{event:{method:'item/started',params:{threadId:'a',turnId:'t',item:{id:'i',type:'contextCompaction'}}}});assert.equal(state.items.a[0].status,'inProgress');
 state=reduce(state,{event:{method:'turn/completed',params:{threadId:'a',turn:{id:'t',status:'interrupted'}}}});assert.equal(state.items.a[0].status,'interrupted');
});
// boot.core.capabilities.unsupportedMethods (DeepSeek bridge initialize): the
// command's core request is unavailable, checked before every other gate.
test('unsupported core methods disable fork, review and rewind first; the slash menu drops them',()=>{
 // The reason names the running core (context.coreName), never a hardcoded vendor; without a name, "this core".
 const reason='Not available with DeepSeek Harness yet',unnamed='Not available with this core yet';
 assert.ok(commandUnavailable({id:'rewind',session:true,idle:true},{current:'t',connected:true,hasHistory:true,unsupportedMethods:['thread/revert']}));
 const deepseek={current:'t',connected:true,hasHistory:true,coreName:'DeepSeek Harness',unsupportedMethods:['thread/fork','review/start','thread/revert']};
 for(const [id,method] of [['fork','thread/fork'],['review','review/start'],['rewind','thread/revert']]){
  const command=sessionCommands.find(c=>c.id===id);
  assert.equal(commandUnavailable(command,{current:'t',connected:true,hasHistory:true,unsupportedMethods:[method]}),unnamed,id);
  assert.equal(commandUnavailable(command,{current:'t',connected:true,hasHistory:true,coreName:'GLM Code',unsupportedMethods:[method]}),'Not available with GLM Code yet',id);
  assert.equal(commandUnavailable(command,{...deepseek,unsupportedMethods:[]}),'',id+' with a capable core');
  assert.equal(commandUnavailable(command,{unsupportedMethods:[method]}),unnamed,id+' is checked before the session gates');
  assert.equal(unsupportedCommand(id,deepseek),reason);assert.equal(unsupportedCommand(id,{}),'');
 }
 assert.deepEqual(matchCommands('rew',deepseek),[]);assert.equal(matchCommands('rew',ready)[0].id,'rewind');
 assert.deepEqual(matchCommands('fork',deepseek),[]);assert.deepEqual(matchCommands('review',deepseek),[]);
 for(const id of ['compact','status','export'])assert.equal(commandUnavailable(sessionCommands.find(c=>c.id===id),deepseek),'',id+' stays available');
 // A core that can't compact on request (Gemini CLI lists thread/compact/start) shows /compact as unavailable, not as an
 // enabled row whose every use fails.
 assert.equal(unsupportedCommand('compact',{unsupportedMethods:['thread/compact/start'],coreName:'Gemini CLI'}),'Not available with Gemini CLI yet');
 assert.equal(commandUnavailable(sessionCommands.find(c=>c.id==='compact'),{current:'t',connected:true,hasHistory:true,unsupportedMethods:['thread/compact/start']}),'Not available with this core yet');
});

// Fidelity F05: skills in '/' (cc183b3ab-BNeMUZS1.js:619-700 supported commands include user-invocable skills).
const skills=[{name:'pdf',description:'Read and write PDFs',argumentHint:'[file]',path:'/s/pdf/SKILL.md'},{name:'review',description:'shadowed',path:'/s/review/SKILL.md'},{name:'Bad Name',path:'/s/bad/SKILL.md'},{name:'nopath'},{name:'fx:lint',path:'/p/lint/SKILL.md'}];
test('skills join the slash list after the host commands; a built-in name and non-token names stay out',()=>{
 assert.deepEqual(slashSkills(skills).map(s=>s.name),['pdf','fx:lint']);
 const rows=matchCommands('pd',{skills});
 assert.deepEqual(rows.find(r=>r.id==='pdf'),{id:'pdf',description:'Read and write PDFs',argumentHint:'[file]',kind:'skill',path:'/s/pdf/SKILL.md',matchedAlias:null});
 const all=matchCommands('',{...ready,skills});assert.deepEqual(all.filter(r=>r.kind==='skill').map(r=>r.id),['pdf','fx:lint']);assert.equal(all.findIndex(r=>r.kind==='skill'),all.length-2,'skills follow the commands');
 assert.equal(matchCommands('review',{...ready,skills}).filter(r=>r.id==='review').length,1,'the host review command keeps its name');
 assert.deepEqual(matchCommands('pdf ',{skills}),[],'a typed space after a known skill closes the menu');
});
test('a known skill parses with no error and exposes the skill; unknown names still error',()=>{
 const parsed=parse('/pdf summarize this',{skills});
 assert.equal(parsed.error,null);assert.equal(parsed.skill.name,'pdf');assert.equal(parsed.skill.path,'/s/pdf/SKILL.md');assert.equal(parsed.args,'summarize this');assert.equal(parsed.command,null);
 assert.equal(parse('/pdf',{skills}).args,'');
 assert.equal(parse('/pdf first\nsecond',{skills}).error,null,'a skill message may span lines');
 assert.match(parse('/pdf summarize').error,/isn’t a command here/,'without the skill list the name is unknown');
 assert.match(parse('/nope',{skills}).error,/isn’t a command here/);
 assert.equal(parse('/review x',{skills}).command.id,'review','a host command wins over a same-named skill');
 assert.equal(parse('/fx:lint src',{skills}).skill.name,'fx:lint','a plugin-qualified skill name parses whole');
 assert.equal(parse('/pdf:x',{skills}).error,'/pdf:x isn’t a command here.','a longer token is not the pdf skill');
});
// cc43287c9-BMbiZYzF.js:28880-28916 vG.
test('/plan follows vG: switch, pane, draft and the already-in-plan notices',()=>{
  const plan=(arg,extra={})=>planCommandAction({arg,currentMode:'auto',canOpenPane:true,...extra});
  const run=(switchToPlan,openPane,notice,composerText)=>({kind:'run',switchToPlan,openPane,notice,composerText});
  assert.deepEqual(plan(''),run(true,false,null,null),'not planning, no plan: switch only');
  assert.deepEqual(plan('',{hasPlan:true}),run(true,true,null,null),'not planning, a plan: switch and open the pane');
  assert.deepEqual(plan('Explain',{hasPlan:true}),run(true,false,null,'Explain'),'a description goes to the draft');
  assert.deepEqual(plan('open'),plan(''),'open and share read as no description');assert.deepEqual(plan('SHARE',{hasPlan:true}),plan('',{hasPlan:true}));
  const planning={currentMode:'plan'};
  assert.deepEqual(plan('',planning),run(false,false,'already_in_plan_no_plan',null));
  assert.deepEqual(plan('',{...planning,hasPlan:true}),run(false,true,null,null),'a written plan opens instead of a notice');
  assert.deepEqual(plan('',{...planning,hasPlan:true,paneAlreadyOpen:true}),run(false,false,'already_in_plan',null));
  assert.deepEqual(plan('',{...planning,hasPlan:true,canOpenPane:false}),run(false,false,'already_in_plan',null));
  assert.deepEqual(plan('Explain',planning),run(false,false,'already_in_plan','Explain'),'a description while planning still warns');
  assert.deepEqual(plan('Explain',{...planning,hasPlan:true}),run(false,true,'already_in_plan','Explain'));
  assert.deepEqual(plan('',{planSelectable:false}),{kind:'unavailable'});
  assert.deepEqual(plan('',{planSelectable:false,hasPlan:true}),run(false,true,null,null));
  assert.deepEqual(plan('Explain',{planSelectable:false,hasPlan:true}),{kind:'unavailable'});
});

test("/usage promises plan usage and rate limits only on a core that reports them", async () => {
  const { matchCommands: match, sessionCommandDescription, sessionCommands: commands } = await import("../src/session-command-model.mjs");
  const usage = commands.find((command) => command.id === "usage");
  assert.equal(sessionCommandDescription(usage, {}), "Show plan usage, credits and rate limits");
  assert.equal(sessionCommandDescription(usage, { perTokenBilling: true }), "Show the tokens used on this Mac");
  assert.equal(match("usage", { perTokenBilling: true }).find((row) => row.id === "usage").description, "Show the tokens used on this Mac");
  assert.equal(match("usage", {}).find((row) => row.id === "usage").description, "Show plan usage, credits and rate limits");
});

// B05 C4 (2.31226.0 shared-5 mS/yS slash-command-suggestion; ca80fca8d :15423 midMessageNeedsName): the '/' list follows
// the caret's token anywhere in the draft, as the tiptap Suggestion with allowSpaces and allowedPrefixes [' '] finds it.
test('slash token: start of draft, mid-message after a space, later lines, caret-relative',()=>{
 const at=(text,caret=text.length,options)=>slashToken(text,caret,options);
 assert.deepEqual(at('/'),{start:0,end:1,query:''},'a bare / opens at the very start');
 assert.deepEqual(at('/rev'),{start:0,end:4,query:'rev'});
 assert.deepEqual(at('please run /rev'),{start:11,end:15,query:'rev'},'mid-message /skill');
 assert.equal(at('please run /'),null,'midMessageNeedsName: a bare / mid-message stays closed');
 assert.deepEqual(at('please run /',12,{midMessageNeedsName:false}),{start:11,end:12,query:''});
 assert.deepEqual(at('line one\n/rev'),{start:9,end:13,query:'rev'},'multi-line drafts open on any line');
 assert.deepEqual(at('first\nthen /com'),{start:11,end:15,query:'com'});
 assert.equal(at('a/b'),null,'the char before / must be a space or the run start');
 assert.equal(at('path/to/file'),null);
 assert.deepEqual(at('/review this'),{start:0,end:12,query:'review this'},'allowSpaces: the query runs to the caret');
 assert.deepEqual(at('x /a /b'),{start:5,end:7,query:'b'},'the last match before the caret');
});
test('slash token limits: caret inside, next char whitespace, 51 chars, leading space, dismissed trigger, run boundary',()=>{
 assert.deepEqual(slashToken('use /rev now',8),{start:4,end:8,query:'rev'},'caret at the token end, a space after it');
 assert.equal(slashToken('use /revnow',8),null,'the char after the caret must be whitespace or the end');
 assert.equal(slashToken('use /rev',3),null,'caret before the /');
 assert.equal(slashToken('/'+'a'.repeat(51),52),null,'at most 51 chars');
 assert.equal(slashToken('/'+'a'.repeat(50),51).query.length,50);
 assert.equal(slashToken('/ x',3),null,'a query starting with a space never opens');
 assert.equal(slashToken('go /rev',7,{dismissedAt:3}),null,'Escape keeps that trigger closed');
 assert.deepEqual(slashToken('go /rev',7,{dismissedAt:0}),{start:3,end:7,query:'rev'});
 // A chip before the caret ends the text run (PM nodeBefore): its own '/name' text is not a trigger.
 assert.equal(slashToken('/theme dark',11,{boundary:6}),null);
 assert.deepEqual(slashToken('/pdf then /rev',14,{boundary:4}),{start:10,end:14,query:'rev'});
 assert.equal(slashToken('',0),null);assert.equal(slashToken('x',5),null);
});
test('a mid-message query feeds matchCommands like a leading one',()=>{
 const token=slashToken('please /comp',12);
 assert.equal(matchCommands(token.query,ready)[0]?.id,'compact');
});

// B31: the '/' list's loading, retry and override states (c5cd1b4dc :3586-3700; ccc334009 z/G).
test("slash menu: headers first, rows, then the loading skeleton; an overriding custom command carries 'Custom command'", async () => {
  const { slashMenuEntries, slashListState, matchCommands, SLASH_RETRY_HEADER, SLASH_PRESESSION_HEADER, CUSTOM_COMMAND_SUBTITLE } = await import('../src/session-command-model.mjs');
  const commands = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(slashMenuEntries(commands, { preSession: true, failed: true, loading: true }).map((entry) => entry.type === 'row' ? entry.command.id : entry.type === 'header' ? entry.label : entry.type),
    [SLASH_PRESESSION_HEADER, SLASH_RETRY_HEADER, 'a', 'b', 'loading']);
  assert.equal(SLASH_RETRY_HEADER, 'Some commands didn’t load. Type / again to retry.');
  assert.deepEqual(slashMenuEntries([], {}), []);
  assert.deepEqual(slashListState({ skills: { status: 'loading', loading: true }, customCommands: { status: 'ready' } }), { loading: true, failed: false });
  assert.deepEqual(slashListState({ skills: { status: 'ready', loading: true } }), { loading: false, failed: false }, 'a reload keeps the rows it shows');
  assert.deepEqual(slashListState({ skills: { status: 'idle' }, customCommands: { status: 'error' } }), { loading: false, failed: true });
  assert.deepEqual(slashListState(), { loading: false, failed: false });
  const rows = matchCommands('pd', { customCommands: [{ name: 'pdf', description: 'Mine', hidesSkill: true }, { name: 'pdq', description: 'Other' }], skills: [{ name: 'pdf', path: '/s/pdf/SKILL.md' }] });
  const custom = rows.filter((row) => row.kind === 'custom');
  assert.deepEqual(custom.map((row) => [row.id, row.subtitle]), [['pdf', CUSTOM_COMMAND_SUBTITLE], ['pdq', undefined]]);
  assert.equal(rows.some((row) => row.kind === 'skill' && row.id === 'pdf'), false, 'the overridden skill stays hidden');
});

test("a command name runs to its last name character: '/compact-' or '/plugin:foo' is not /compact or /plugin with arguments", () => {
  // The name used to backtrack to a word boundary, so '/compact-' compacted with the instructions "-" and '/model:x'
  // asked for model ":x".
  for (const [text, requested] of [["/compact-", "compact-"], ["/plugin:foo", "plugin:foo"], ["/model:x", "model:x"], ["/clear.", "clear."]]) {
    const parsed = parse(text, {});
    assert.equal(parsed.command, undefined, text);
    assert.equal(parsed.requested, requested, text);
    assert.equal(parsed.error, `/${requested} isn’t a command here.`, text);
  }
  // Arguments still start right after the name, with or without a space.
  assert.equal(parse("/compact keep the plan", {}).args, "keep the plan");
  assert.equal(parse("/compact保留计划", {}).args, "保留计划");
  assert.equal(parse("/compact保留计划", {}).command?.id, "compact");
  assert.equal(parse("/usr/bin/env", {}), null, "a path is not a command");
});
