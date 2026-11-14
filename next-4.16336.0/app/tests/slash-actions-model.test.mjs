import test from 'node:test';import assert from 'node:assert/strict';
import {commandArgumentHint,parseSessionCommand} from '../src/session-command-model.mjs';
import {withLocalCommandRows,rewindChoices,transcriptMarkdown} from '../src/slash-actions-model.mjs';
test('trigger and argument hints enforce range and whitespace limits',()=>{
 // W14-code r4 gen-final-4: the test-only slashQuery is deleted (the composer's '/' trigger is the generated suggestion).
 assert.equal(commandArgumentHint('/fork '),'[prompt]');assert.equal(commandArgumentHint('/name '),'[new title]');assert.equal(commandArgumentHint('/fork x'),'');assert.equal(commandArgumentHint('/fork '+' '.repeat(129)),'');
 // /cd <path> is a command now (a fork into that folder, Codex's /cd): it parses with its path.
 assert.equal(parseSessionCommand('/cd ~/x').error,null);assert.equal(parseSessionCommand('/cd ~/x').args,'~/x');assert.match(parseSessionCommand('/feedback').error,/isn’t available/);
});
test('local status rows retain chronological anchors and never mutate protocol items',()=>{
 const items=[{id:'a'},{id:'b'}],rows=[{id:'s',after:'a'},{id:'s2',after:'a'}];assert.deepEqual(withLocalCommandRows(items,rows).map(i=>i.id),['a','s','s2','b']);assert.equal(items.length,2);assert.equal(rows[0].localCommand,undefined);
});
test('export retains code fences and exact text; rewind choices use real user turns',()=>{
 const turns=[{id:'t1',items:[{type:'userMessage',content:[{type:'text',text:'hello'}]},{type:'commandExecution',command:'echo ```',aggregatedOutput:'</script>\nvalue'}]},{id:'t2',items:[{type:'agentMessage',text:'answer'}]}];
 assert.deepEqual(rewindChoices(turns),[{id:'t1',text:'hello'}]);const md=transcriptMarkdown({id:'s',name:'Title'},turns);assert.ok(md.includes('````\necho ```\n````'));assert.ok(md.includes('</script>\nvalue'));assert.ok(md.endsWith('answer\n'));
});

import {emptyState,reduce} from '../src/state.js';
test('confirmed revert removes baseline rows and preserves a new streaming turn during history fetch',()=>{
 const old={id:'old',type:'userMessage',turnId:'gone'},recent={id:'new',type:'agentMessage',turnId:'active',text:'live'};
 const state={...emptyState,items:{s:[old,recent]},active:{s:'active'},activeVersions:{s:2}};
 const next=reduce(state,{type:'hydrate',id:'s',thread:{id:'s',turns:[]},replaceHistory:true,baselineItems:[old],baselineActiveVersion:1});
 assert.deepEqual(next.items.s,[recent]);assert.equal(next.active.s,'active');
});
test('only an explicitly associated inline review outer completion settles its nested active turn',()=>{
 const base={...emptyState,active:{s:'nested'},operations:{s:{operation:'review',turnId:'outer',activeTurnId:'nested'}}};
 const event={method:'turn/completed',params:{threadId:'s',turn:{id:'outer',status:'completed'}}};
 assert.equal(reduce(base,{event}).active.s,null);
 assert.equal(reduce({...base,active:{s:'newer'}},{event}).active.s,'newer');
});
