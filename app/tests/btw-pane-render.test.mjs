import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {sameApprovalPane} from '../src/card-hotkeys-model.mjs';
import {createApprovalDraftRuntime} from '../src/approval-draft-model.mjs';
let server, Pane, Hook, Focus, Plan, TurnError, Notice;
before(async()=>{
  server=await createServer({configFile:false,root:path.resolve(import.meta.dirname,'..'),plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
  Pane=await server.ssrLoadModule('/src/source-btw-pane.jsx');Hook=await server.ssrLoadModule('/src/use-btw-pane.jsx');
  Focus=await server.ssrLoadModule('/src/generated/code-current/btw-focus-intent.mjs');Plan=await server.ssrLoadModule('/src/source-plan-card.jsx');
  TurnError=await server.ssrLoadModule('/src/source-turn-error.jsx');Notice=await server.ssrLoadModule('/src/btw-session-notice-model.mjs');
});
after(()=>server?.close());
const noop=()=>{},state=()=>({threads:{},active:{},items:{},approvals:[],approvalConnectionId:'connection',approvalConnectionEpoch:1});
test('persistent child pane renders own rows and embedded composer, without parent history or hidden reminder',()=>{
  const s=state();s.items.child=[{id:'parent-row',type:'agentMessage',text:'PARENT PRIVATE HISTORY',turnId:'inherited'},
    {id:'child-user',type:'userMessage',turnId:'own',content:[{type:'text',text:'<system-reminder>HIDDEN BOUNDARY</system-reminder>'},{type:'text',text:'Child question'}]},
    {id:'child-answer',type:'agentMessage',text:'Child answer',turnId:'own'}];
  const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{sessionId:'child',meta:{btw:{permission:'ask',ownTurnIds:['own']}},thread:{id:'child',cwd:'/repo'},tabs:[{id:'child',name:'btw: Question'}],state:s,connected:true,onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop}));
  assert.match(html,/data-side-session-pane="child"/);assert.match(html,/Child question/);assert.match(html,/Child answer/);
  assert.doesNotMatch(html,/PARENT PRIVATE HISTORY|HIDDEN BOUNDARY/);assert.match(html,/Reply in this session/);
  assert.match(html,/data-embedded="true"/);assert.doesNotMatch(html,/sc-permission|sc-model-trigger/);assert.match(html,/role="tablist"/);
});
test('running or sending tabs cannot be closed; active tab has roving focus',()=>{
  const s=state();s.active.running='turn';const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwTabs,{tabs:[{id:'running',name:'btw: Running'},{id:'sending',name:'btw: Sending'},{id:'idle',name:'btw: Idle'}],activeId:'running',state:s,pending:{sending:true},onSelect:noop,onClose:noop}));
  assert.equal((html.match(/aria-label="Close side chat"/g)||[]).length,1);
  assert.match(html,/data-vtb-id="running"[\s\S]*?role="tab" tabindex="0" aria-selected="true"/);
  assert.match(html,/data-vtb-id="idle"[\s\S]*?role="tab" tabindex="-1" aria-selected="false"/);
  assert.doesNotMatch(html,/aria-label="New tab"|touch-none|Press Control\+Shift/,'FT does not enable creation or reordering');
});
test('approval keyboard scope isolates children from main and each other; unfocused page belongs to main',()=>{
  const one={},two={},element=pane=>({closest:()=>pane}),a=element(one),b=element(one),c=element(two),main=element(null);
  assert.equal(sameApprovalPane(a,b),true);assert.equal(sameApprovalPane(a,c),false);assert.equal(sameApprovalPane(a,main),false);
  assert.equal(sameApprovalPane(null,a),false);assert.equal(sameApprovalPane(null,main),true);
});
function transport(handler=async()=>({turn:{id:'new'}})) {
  const s=state();s.active.parent='parent-turn';const calls=[],dispatches=[],ref={current:s};
  const host={currentRef:{current:'parent'},stateRef:ref,sessionsRef:{current:[{id:'child',cwd:'/child-repo',historyMode:'legacy'}]},
    metadata:{child:{btw:{permission:'ask'},model:'child-model',effort:'low',additionalFolders:['/child-extra']}},boot:{connected:true,core:{id:'codex',capabilities:{btwChildSessions:true}},config:{model:'global-other'}},
    call:async(action,params)=>{calls.push({action,...params});return handler(action,params);},dispatch:value=>dispatches.push(value),
    tileStore:{getSession:()=>null},onError:noop};
  let controller;function Harness(){controller=Hook.useBtwPane(host);return null;}renderToStaticMarkup(React.createElement(Harness));
  return {controller,s,calls,dispatches,host,render:()=>{renderToStaticMarkup(React.createElement(Harness));return controller;}};
}
test('child follow-ups resume once, use child identity/permission/model, and never touch running parent',async()=>{
  const h=transport();await h.controller.send('child','First');await h.controller.send('child','Follow up');
  assert.deepEqual(h.calls.map(c=>c.method),['thread/resume','turn/start','turn/start']);
  assert.ok(h.calls.every(c=>c.params.threadId==='child'));assert.ok(h.calls.every(c=>c.expected.connectionEpoch===1));
  const turn=h.calls[1].params;assert.equal(turn.cwd,'/child-repo');assert.equal(turn.model,'child-model');assert.equal(turn.effort,'low');
  assert.equal(turn.approvalPolicy,'untrusted');assert.equal(turn.sandboxPolicy.type,'workspaceWrite');assert.ok(turn.sandboxPolicy.writableRoots.includes('/child-extra'));
  assert.equal(h.s.active.parent,'parent-turn');assert.equal(h.dispatches.length,0);
});
test('reconnect while resuming refuses turn/start; confirmed acceptance is not converted into a failed send',async()=>{
  let h;h=transport(async(_action,p)=>{h.s.approvalConnectionEpoch++;return {};});
  await assert.rejects(h.controller.send('child','Question'),/connection changed/);assert.deepEqual(h.calls.map(c=>c.method),['thread/resume']);
  let a;a=transport(async(_action,p)=>{if(p.method==='turn/start'){a.s.approvalConnectionEpoch++;return {turn:{id:'accepted'}};}return {};});
  assert.deepEqual(await a.controller.send('child','Question'),{turn:{id:'accepted'}});
});
test('child stop targets its active turn and prevents concurrent duplicate interrupts',async()=>{
  let resolve;const gate=new Promise(r=>resolve=r),h=transport(()=>gate);h.s.active.child='child-turn';
  const first=h.controller.stop('child');await h.controller.stop('child');assert.equal(h.calls.length,1);
  assert.deepEqual(h.calls[0],{action:'interrupt',threadId:'child',turnId:'child-turn',expected:{connectionId:'connection',connectionEpoch:1}});
  resolve({});await first;assert.equal(h.s.active.parent,'parent-turn');
});
test('unset local model inherits the resumed child model rather than the Home default; Auto and network follow settings',async()=>{
  const h=transport(async(_action,p)=>p.method==='thread/resume'?{model:'inherited-model',reasoningEffort:'high'}:{turn:{id:'own'}});
  h.host.metadata.child={btw:{permission:'auto'}};h.host.boot.core.capabilities.autoReview=true;h.host.boot.config.sandboxNetworkAccess=true;
  await h.controller.send('child','Continue');const params=h.calls[1].params;
  assert.equal(params.model,'inherited-model');assert.equal(params.effort,'high');assert.equal(params.approvalsReviewer,'auto_review');assert.equal(params.sandboxPolicy.networkAccess,true);
});
test('child history hydrates only child with an event baseline; stale history is not installed',async()=>{
  let h;h=transport(async(_action,p)=>({thread:{id:'child',historyMode:'legacy',turns:[{id:'old',items:[]}]}}));
  await h.controller.load('child');assert.equal(h.dispatches[0].id,'child');assert.deepEqual(h.dispatches[0].thread.turns,[{id:'old',items:[]}]);
  let stale;stale=transport(async()=>{stale.s.approvalConnectionEpoch++;return {thread:{id:'child',historyMode:'legacy',turns:[]}};});
  await assert.rejects(stale.controller.load('child'),/connection changed/);assert.equal(stale.dispatches.length,0);
});
test('running child submit preserves priority and never resumes or starts the parent',async()=>{
  const h=transport(async(action,p)=>action==='steer'?{ok:true}:{data:[]});
  h.host.boot.core.capabilities.reorderQueued=true;h.s.active.child='child-turn';
  await h.controller.send('child','Next',{priority:'next'});
  await h.controller.send('child','Later',{priority:'later'});
  assert.equal(h.calls[0].action,'steer');assert.equal(h.calls[0].threadId,'child');assert.equal(h.calls[0].expectedTurnId,'child-turn');
  const queued=h.calls.find(c=>c.method==='thread/queue/add');assert.equal(queued.params.input[0].text,'Later');assert.equal(queued.params.threadId,'child');
  assert.equal(h.calls.some(c=>['thread/resume','turn/start'].includes(c.method)),false);assert.equal(h.s.active.parent,'parent-turn');
});
test('child queue renders its own controls and ignores snapshots from an older connection',()=>{
  const s=state();s.active.child='child-turn';
  const props={sessionId:'child',meta:{btw:{permission:'ask'}},thread:{id:'child'},tabs:[{id:'child'}],state:s,connected:true,
    onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop,queueEnabled:true,queueEpoch:'one',
    queueState:{epoch:'one',queue:{entries:[{id:'q',input:[],preview:'CHILD QUEUED TEXT'}]},pending:[{preview:'CHILD STEER'}],busy:false},queues:{}};
  const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props));
  assert.match(html,/CHILD QUEUED TEXT/);assert.match(html,/CHILD STEER/);assert.match(html,/aria-label="Send now"/);assert.match(html,/aria-label="Edit in composer"/);
  const stale=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,queueEpoch:'two'}));
  assert.doesNotMatch(stale,/CHILD QUEUED TEXT|CHILD STEER|aria-label="Send now"/);
});
function planning(h) {
  h.host.metadata.child={...h.host.metadata.child,btw:{permission:'plan',ownTurnIds:['own-plan']}};
  h.s.items.child=[{id:'inherited-plan',type:'plan',turnId:'parent-plan',status:'completed',text:'Parent plan'},
    {id:'own-plan-item',type:'plan',turnId:'own-plan',status:'completed',text:'Child plan'}];
}
test('pending Plan protects only its tab, leaving the decision card enabled; persisted Stay releases it',()=>{
  const h=transport();planning(h);let current=h.render();
  assert.equal(current.tabPending.child,true);assert.equal(current.pending.child,undefined);assert.equal(current.tabPending.parent,undefined);
  const props={sessionId:'child',tabs:[{id:'child'}],meta:h.host.metadata.child,thread:{id:'child'},state:h.s,
    connected:false,pending:current.pending,tabPending:current.tabPending,onSelect:noop,onCloseTab:noop};
  const pending=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props));
  assert.doesNotMatch(pending,/aria-label="Close side chat"/);
  h.host.metadata.child.btw.planAnsweredTurnId='own-plan';current=h.render();assert.equal(current.tabPending.child,undefined);
  const settled=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,tabPending:current.tabPending}));
  assert.match(settled,/aria-label="Close side chat"/);
});
test('native child Plan implementation uses the child model/turn and adopts its mode only after acceptance',async()=>{
  const h=transport();planning(h);await h.controller.implementPlan('child','own-plan','acceptEdits');
  const turn=h.calls.find(c=>c.method==='turn/start').params;
  assert.equal(turn.threadId,'child');assert.equal(turn.input[0].text,'Implement the plan.');assert.equal(turn.model,'child-model');
  assert.equal(turn.codeDesktop.workflowTurn.permission,'acceptEdits');assert.equal(turn.collaborationMode.mode,'default');
  await h.controller.send('child','Continue');assert.equal(h.calls.at(-1).params.codeDesktop.workflowTurn.permission,'acceptEdits');
  // A later authoritative metadata change replaces the temporary local acknowledgment.
  h.host.metadata.child={...h.host.metadata.child,btw:{...h.host.metadata.child.btw,permission:'plan'}};
  await h.controller.send('child','Plan again');assert.equal(h.calls.at(-1).params.codeDesktop.workflowTurn.permission,'plan');
  assert.equal(h.s.active.parent,'parent-turn');
});
test('Stay in Plan persists the answer without a model message; stale, non-child, waiting and unsupported implementation targets are refused',async()=>{
  const stay=transport(async(_a,p)=>({status:'answered',sessionId:p.sessionId,turnId:p.turnId}));planning(stay);await stay.controller.stayPlan('child','own-plan');
  await assert.rejects(stay.controller.implementPlan('child','own-plan'),/active session/);
  assert.deepEqual(stay.calls,[{action:'btw-session',op:'plan-stay',sessionId:'child',turnId:'own-plan',expected:{connectionId:'connection',connectionEpoch:1}}]);
  const stale=transport();planning(stale);await assert.rejects(stale.controller.implementPlan('child','parent-plan'),/active session/);
  await assert.rejects(stale.controller.implementPlan('parent','parent-plan'),/active session/);
  await assert.rejects(stale.controller.implementPlan('child','own-plan','bypass'),/Unsupported/);
  stale.s.active.child='new-turn';await assert.rejects(stale.controller.implementPlan('child','own-plan'),/active session/);assert.equal(stale.calls.length,0);
});
test('failed implementation keeps Plan and allows retry; concurrent implementation clicks cannot start twice',async()=>{
  let refuse=true;const h=transport(async(_a,p)=>{if(p.method==='turn/start'&&refuse)throw new Error('refused');return {turn:{id:'accepted'}};});planning(h);
  await assert.rejects(h.controller.implementPlan('child','own-plan'),/refused/);assert.equal(h.host.metadata.child.btw.permission,'plan');
  refuse=false;await h.controller.implementPlan('child','own-plan');await assert.rejects(h.controller.implementPlan('child','own-plan'),/active session/);
  let resolve;const pending=new Promise(r=>resolve=r),busy=transport(()=>pending);planning(busy);
  const first=busy.controller.implementPlan('child','own-plan');await assert.rejects(busy.controller.implementPlan('child','own-plan'),/active session/);
  resolve({turn:{id:'accepted'}});await first;assert.equal(busy.calls.filter(c=>c.method==='turn/start').length,1);
});
test('an old accepted implementation cannot replace a Stay in Plan choice made on a new connection',async()=>{
  let resolve,started;const gate=new Promise(r=>resolve=r),ready=new Promise(r=>started=r);
  const h=transport(async(_a,p)=>{if(p.method==='turn/start'){started();return gate;}return p.op==='plan-stay'?{status:'answered',sessionId:p.sessionId,turnId:p.turnId}:{};});planning(h);
  const implementation=h.controller.implementPlan('child','own-plan');await ready;
  h.s.approvalConnectionEpoch=2;
  h.host.metadata.child={...h.host.metadata.child,btw:{permission:'plan',ownTurnIds:['new-plan']}};
  h.s.items.child=[{id:'new',type:'plan',turnId:'new-plan',text:'New plan',status:'completed'}];
  await h.controller.stayPlan('child','new-plan');resolve({turn:{id:'old-accepted'}});await implementation;
  await assert.rejects(h.controller.implementPlan('child','new-plan'),/active session/);
  assert.equal(h.calls.filter(c=>c.method==='turn/start').length,1);
});
test('failed Stay preserves the proposal for retry, rejects concurrent implementation, and honors answers from other windows',async()=>{
  let resolve;const gate=new Promise(r=>resolve=r);let fail=true;
  const h=transport(async(_a,p)=>{await gate;if(fail)throw Error('save failed');return {status:'answered',sessionId:p.sessionId,turnId:p.turnId};});planning(h);
  const first=h.controller.stayPlan('child','own-plan');
  await assert.rejects(h.controller.implementPlan('child','own-plan'),/active session/);
  await assert.rejects(h.controller.stayPlan('child','own-plan'),/active session/);
  resolve();await assert.rejects(first,/save failed/);fail=false;await h.controller.stayPlan('child','own-plan');
  const restored=transport();planning(restored);restored.host.metadata.child.btw.planAnsweredTurnId='own-plan';
  await assert.rejects(restored.controller.implementPlan('child','own-plan'),/active session/);
  await assert.rejects(restored.controller.stayPlan('child','own-plan'),/active session/);assert.equal(restored.calls.length,0);
});
test('side plan review keeps the composer mounted but hidden and offers only Manual/Accept edits',()=>{
  const s=state(),request={id:1,bridgeApproval:{connectionId:'connection',instanceId:'plan-review'},method:'item/tool/requestUserInput',
    params:{threadId:'child',turnId:'own',itemId:'review',questions:[{id:'plan-review',header:'Plan',question:'Approve?',isOther:true,isSecret:false,
      options:[{label:'Approve',description:'Implement'},{label:'Keep planning',description:'Stay'}]}]}};
  s.approvals=[request];const runtime=createApprovalDraftRuntime();runtime.reconcile(s.approvals);
  const props={sessionId:'child',meta:{btw:{permission:'plan'}},thread:{id:'child'},tabs:[{id:'child'}],state:s,connected:true,
    onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop,approvalRuntime:runtime,respond:noop};
  const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props));
  assert.match(html,/data-btw-composer-hidden="true"/);assert.match(html,/Reply in this session/);
  assert.match(html,/Accept and allow edits/);assert.doesNotMatch(html,/More accept options|Accept and auto mode|Accept and bypass/);
  assert.deepEqual(Plan.planCardActions('acceptEdits',false,{acceptModes:['acceptEdits']}).more,[]);
  assert.deepEqual(Plan.planCardActions('acceptEdits').more.map(value=>value.mode),['auto'],'main-session defaults stay available');
  s.approvals=[{...request,params:{...request.params,threadId:'parent'}}];
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props)),/data-btw-composer-hidden="true"/,'a parent review cannot hide the child composer');
});

// Render the actual component and run effects with deterministic hook cells;
// child JSX is inspected without a browser or live transport.
function componentFixture(component, props) {
  const cells=[],effects=[];let cursor=0,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const dispatcher={
    useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next;}];},
    useRef(initial){return dispatcher.useState(()=>({current:initial}))[0];},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},
    useSyncExternalStore(_subscribe,getSnapshot){return getSnapshot();},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}},
    // D21: the original ccf527892 hand-back hook runs in a layout effect; flushed in order with the passive ones.
    useLayoutEffect(fn,deps){return dispatcher.useEffect(fn,deps);},
    // R4g-btw BT4: the generated qj keeps its card-left callback with useCallback.
    useCallback(fn,deps){return dispatcher.useMemo(()=>fn,deps);},
  };
  const render=()=>{cursor=0;const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;
    internals.H=dispatcher;try{tree=component(props);}finally{internals.H=old;}return tree;};
  render();return {get tree(){return tree;},render,flush:()=>{while(effects.length)effects.shift()();},close:()=>cells.forEach(c=>c.cleanup?.())};
}
function findNode(tree,predicate){if(!tree||typeof tree!=='object')return null;if(!Array.isArray(tree)&&predicate(tree))return tree;const children=Array.isArray(tree)?tree:[tree.props?.children];for(const child of children){const found=findNode(child,predicate);if(found)return found;}return null;}
// R3-nested step 3: jT `B && m.current?.scheduleFocus()` — the editor element's OP scheduleFocus (caret at the end).
test('child mount consumes focus intent once through the composer scheduleFocus, and a passive mount leaves focus alone',()=>{
  for(const intended of [false,true]){
    const scheduled=[],id=`focus-child-${intended}`,input={current:{value:'Draft',scheduleFocus:(...args)=>scheduled.push(args),
      focus:()=>assert.fail('scheduleFocus, not focus()'),setSelectionRange:()=>assert.fail('scheduleFocus places the caret itself')}};
    if(intended)Focus.rememberBtwFocus(id,Focus.captureBtwFocus());
    const props={sessionId:id,meta:{btw:{}},thread:{id},state:state(),connected:false,input,root:{current:null},onLoad:async()=>{}};
    const f=componentFixture(Pane.SourceBtwContent,props);f.flush();f.render();f.flush();
    assert.deepEqual(scheduled,intended?[[]]:[],'scheduleFocus() with the default caret');f.close();
    const again=componentFixture(Pane.SourceBtwContent,props);again.flush();assert.equal(scheduled.length,intended?1:0);again.close();
  }
});
test('a focus intent cannot focus an archived editor or a replacement editor belonging to another child',()=>{
  for(const archived of [true,false]){
    const id=`focus-refusal-${archived}`;Focus.rememberBtwFocus(id,Focus.captureBtwFocus());
    const props={sessionId:id,meta:{btw:{}},thread:{id,archived},state:state(),connected:false,root:{current:null},
      input:{current:{value:'Draft',closest:()=>({getAttribute:()=>archived?id:'replacement-child'}),focus:()=>assert.fail('unavailable editor was focused'),
        scheduleFocus:()=>assert.fail('unavailable editor was focused')}}};
    const f=componentFixture(Pane.SourceBtwContent,props);f.flush();f.close();
  }
});
test('native child handoff appears after history loads, hides rather than deletes the draft, and is scoped to its turn',async()=>{
  const s=state();s.items.child=[{id:'plan',type:'plan',turnId:'own-plan',status:'completed',text:'Child plan'}];
  const sent=[],stayed=[],props={sessionId:'child',meta:{btw:{permission:'plan',ownTurnIds:['own-plan']}},thread:{id:'child'},state:s,connected:true,
    input:{current:null},root:{current:null},queueEpoch:'connection:1:codex',onLoad:async()=>{},onImplementPlan:async(...args)=>sent.push(args),onStayPlan:(...args)=>stayed.push(args),onError:noop};
  const f=componentFixture(Pane.SourceBtwContent,props);assert.equal(findNode(f.tree,n=>n.props?.handoffKey),null);
  f.flush();await new Promise(resolve=>setImmediate(resolve));f.render();
  const card=findNode(f.tree,n=>n.props?.handoffKey);assert.equal(card.props.handoffKey,'btw:child:own-plan');assert.deepEqual(card.props.acceptModes,['acceptEdits']);
  assert.equal(findNode(f.tree,n=>n.props?.['data-btw-composer-hidden']==='true').props.className,'hidden');
  card.props.onImplement('ask');card.props.onStay();assert.deepEqual(sent,[['child','own-plan','ask']]);assert.deepEqual(stayed,[['child','own-plan']]);
  props.planAnswered={epoch:props.queueEpoch,turnId:'own-plan'};f.render();assert.equal(findNode(f.tree,n=>n.props?.handoffKey),null);
  // A persisted answer hides the same card after reopening on a fresh epoch.
  props.planAnswered=null;props.queueEpoch='connection:2:codex';props.meta.btw.planAnsweredTurnId='own-plan';
  f.render();assert.equal(findNode(f.tree,n=>n.props?.handoffKey),null);
  assert.equal(findNode(f.tree,n=>n.props?.['data-btw-composer-hidden']==='true'),null);f.close();
});
test('tab close preserves focus in another pane; reselect focuses the current input without changing its selection',()=>{
  const closed=[],focused=[],inside={},outside={},doc={body:{},activeElement:outside};
  const props={sessionId:'one',tabs:[{id:'one'}],state:state(),onCloseTab:(...args)=>closed.push(args),onSelect:noop};
  const f=componentFixture(Pane.SourceBtwPane,props);
  f.tree.props.ref.current={ownerDocument:doc,closest:()=>({contains:node=>node===inside})};
  const tabs=findNode(f.tree,n=>n.type===Pane.SourceBtwTabs),body=findNode(f.tree,n=>n.type===Pane.SourceBtwContent);
  body.props.input.current={focus:()=>focused.push(true),setSelectionRange:()=>assert.fail('reselect preserves selection')};
  tabs.props.onClose('one');doc.activeElement=inside;tabs.props.onClose('one');tabs.props.onReselect();
  assert.deepEqual(closed,[['one',false],['one',true]]);assert.equal(focused.length,1);
  assert.equal(body.key,'one');props.sessionId='two';f.render();assert.equal(findNode(f.tree,n=>n.type===Pane.SourceBtwContent).key,'two');f.close();
});
test('host tab activation remembers focus, while automatic neighbor selection can preserve other-pane focus',()=>{
  const h=transport(),selected=[];h.host.tileStore.setSession=(...args)=>selected.push(args);
  h.controller.select('parent','focus-selection');h.controller.select('parent','passive-selection',{focus:false});
  const consume=id=>{let value;function Check(){value=Focus.useBtwFocusIntent(id);return null;}renderToStaticMarkup(React.createElement(Check));return value;};
  assert.equal(consume('focus-selection'),true);assert.equal(consume('passive-selection'),false);
  assert.deepEqual(selected,[['parent',{btwSessionId:'focus-selection'}],['parent',{btwSessionId:'passive-selection'}]]);
});

// R2-btw NBS-6: 2.42304.0 cccc2cf0a jT — the session error notice nT before the approvals, the send-failure toast rule,
// and onFocusHandBack (focusPreservingSelection + ignoreStrayEnter) through the original ccf527892 card-left hook.
const failedChild=(id,{inheritedError=true,ownError={message:'The model is overloaded',codexErrorInfo:'serverOverloaded'}}={})=>{
  const s=state();s.turnErrors={[id]:{...(inheritedError?{inherited:{message:'PARENT FAILURE'}}:{}),...(ownError?{own:ownError}:{})}};
  s.items[id]=[{id:'parent-user',type:'userMessage',turnId:'inherited',content:[{type:'text',text:'Parent question'}]},
    {id:'child-user',type:'userMessage',turnId:'own',content:[{type:'text',text:'Child question'}]}];
  return s;
};
// R3-nested step 3: nT hides errorSource "transcript" — a failed turn's own error is drawn in that turn by the child
// transcript, so the notice is the thread-wide (session) error only.
test('notice model: only the thread-wide error is the notice; a turn\'s own error belongs to the transcript',()=>{
  assert.equal(Notice.btwSessionNotice({}),null);
  assert.equal(Notice.btwSessionNotice({items:[{id:'c',turnId:'own'}],turnErrors:{own:{message:'latest'}}}),null,'a per-turn error is never the notice');
  const first={message:'thread'},second={message:'thread'};
  const a=Notice.btwSessionNotice({threadError:first}),b=Notice.btwSessionNotice({threadError:second});
  assert.equal(a.turnId,'thread');assert.notEqual(a.key,b.key,'a repeated failure is a new error');
  assert.equal(Notice.btwSessionNotice({threadError:first}).key,a.key);
  assert.deepEqual(a,{key:a.key,turnId:'thread',error:first});
  assert.equal(Notice.sendFailureToasts({before:null,after:null}),true);
  assert.equal(Notice.sendFailureToasts({before:'turn:x',after:'turn:x'}),true,'the same notice as before the send still toasts');
  assert.equal(Notice.sendFailureToasts({before:null,after:'thread:1'}),false,'a new notice replaces the toast');
  const store=Notice.createBtwNoticeDismissals();let calls=0;store.subscribe(()=>calls++);
  store.dismiss('s','k');store.dismiss('s','k');assert.equal(calls,1);assert.equal(store.isDismissed('s','k'),true);assert.equal(store.isDismissed('s','other'),false);
});
test('the child transcript draws its own failed turn (card, then markers); the thread-wide error is the dismissable notice',()=>{
  const id='notice-ssr',s=failedChild(id);
  s.items[id].push({id:'child-answer',type:'agentMessage',text:'Partial answer',turnId:'own'});
  const props={sessionId:id,meta:{btw:{permission:'ask',ownTurnIds:['own']}},thread:{id,cwd:'/repo'},tabs:[{id}],state:s,connected:true,
    onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop};
  const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props));
  assert.match(html,/data-turn-error="card" data-turn-id="own"/);assert.doesNotMatch(html,/data-turn-id="inherited"|PARENT FAILURE/);
  const answer=html.indexOf('Partial answer'),card=html.indexOf('data-turn-error="card"'),scope=html.indexOf('data-approval-hotkey-scope="btw:notice-ssr"');
  assert.ok(answer>=0&&answer<card&&card<scope,'inside the transcript, after the failed turn\'s last row, not in the approval area');
  assert.doesNotMatch(html,/ste-dismiss|aria-label="Dismiss"/,'a transcript error has no Dismiss');
  assert.doesNotMatch(html,/>Try again<|>Compact session</,'the child pane offers neither Try again nor Compact (no MW provider; nT passes no onRetry)');
  // An older own failure is a marker once a newer own turn exists; a running turn retires the card.
  const two=failedChild(id);two.turnErrors[id].own2={message:'Second failure',codexErrorInfo:'serverOverloaded'};
  two.items[id].push({id:'second-user',type:'userMessage',turnId:'own2',content:[{type:'text',text:'Again'}]});
  const both=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,meta:{btw:{permission:'ask',ownTurnIds:['own','own2']}},state:two}));
  assert.match(both,/data-turn-error="marker" data-turn-id="own"/);assert.match(both,/data-turn-error="card" data-turn-id="own2"/);
  const running={...s,active:{[id]:'own-next'}};
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:running})),/data-turn-error="card"/);
  // nT: the thread-wide error, first in the approval scope, before the composer, with cb1a6e506 A's header Dismiss.
  const thread={...failedChild(id,{ownError:null}),errors:{[id]:{message:'Thread-wide failure'}}};
  const notice=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:thread}));
  assert.match(notice,/data-turn-error="card" data-turn-id="thread"/);
  const noticeScope=notice.indexOf('data-approval-hotkey-scope="btw:notice-ssr"'),noticeCard=notice.indexOf('data-turn-id="thread"'),composer=notice.indexOf('Reply in this session');
  assert.ok(noticeScope>=0&&noticeScope<noticeCard&&noticeCard<composer,'nT is the first child of the approval scope, before the composer');
  assert.match(notice,/<span class="ste-headline">[^<]*<\/span><span class="ste-dismiss -my-pad-xs -me-pad-xs flex shrink-0"><button aria-label="Dismiss"[^>]*data-variant="ghost"[^>]*data-size="sm" data-cds-icon-only=""[^>]*class="source-settings-button text-muted hover:text-primary"/);
  assert.doesNotMatch(notice,/>Try again<|>Compact session</,'c3e34355f under nT: no onRetry, compactHelps: !1');
  const plain=renderToStaticMarkup(React.createElement(TurnError.SourceTurnError,{error:{message:'x'},turnId:'t'}));
  assert.doesNotMatch(plain,/aria-label="Dismiss"|ste-dismiss/,'other cards have no Dismiss unless asked');
});
test('nT hide conditions and its actions are the 2.42304.0 originals this mapping follows',async()=>{
  const {readFile}=await import('node:fs/promises');
  const v1=path.resolve(import.meta.dirname,'../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const pane=await readFile(path.join(v1,'cccc2cf0a-B0D--VZp.js'),'utf8'),card=await readFile(path.join(v1,'c3e34355f-DqW-8zts.js'),'utf8');
  assert.ok(pane.includes('i==="transcript"||u&&r==="cli_resume_not_found"||Oi(r)||t?.neverStarted===!0?null:'),'nT\'s null branch');
  assert.ok(/nonResendable:s,turnComplete:c,onDismiss:m\}\)\}/.test(pane),'nT passes no onRetry / onCompact to w_');
  assert.ok(card.includes('rewindHelps:!1,compactHelps:!1'),'c3e34355f fn hard-codes compactHelps off');
  assert.ok(card.includes('!Q||!C?C:'),'without onRetry (C) there is no retry handler');
  const model=await readFile(path.resolve(import.meta.dirname,'../src/btw-session-notice-model.mjs'),'utf8');
  assert.doesNotMatch(model,/from '\.\/turn-error-model\.mjs'/,'the notice model no longer draws per-turn errors');
});
// R2 review: SourceTurnError is outside this lane; its onDismiss must stay a pure addition for every other caller.
test('SourceTurnError onDismiss only adds the header Dismiss span to a card; markers and the CSS stay scoped',async()=>{
  const {readFile}=await import('node:fs/promises');
  const errors=[{message:'token expired',codexErrorInfo:'unauthorized'},{message:'context',codexErrorInfo:'contextWindowExceeded'},
    {message:'limit',codexErrorInfo:'usageLimitExceeded'},{message:'busy',codexErrorInfo:'serverOverloaded'},{message:'cyber',codexErrorInfo:'cyberPolicy'},
    {message:'mis',codexErrorInfo:'misalignmentPolicyViolation',misalignment:{detailedExplanation:'why'}},{message:'budget',codexErrorInfo:'sessionBudgetExceeded'},
    {message:'net',codexErrorInfo:{responseStreamDisconnected:{httpStatusCode:502}}},{message:'',codexErrorInfo:null},null];
  const all={onRetry:noop,onCompact:noop,onViewUsage:noop,onNewSession:noop,onOpenSettings:noop,onOpenLink:noop,onRewind:noop,onSwitchModel:noop,onSignIn:noop,onEditConfig:noop};
  const draw=props=>renderToStaticMarkup(React.createElement(TurnError.SourceTurnError,{turnId:'t',...props}));
  const span=/<span class="ste-dismiss -my-pad-xs -me-pad-xs flex shrink-0"><button aria-label="Dismiss"[^]*?<\/button><\/span>/;
  for(const error of errors)for(const extra of [{},all]){
    const base=draw({error,...extra}),dismissable=draw({error,...extra,onDismiss:noop});
    assert.equal((dismissable.match(/ste-dismiss/g)||[]).length,1);assert.equal(dismissable.replace(span,''),base,'the span is the only difference');
    assert.equal(draw({error,...extra,variant:'marker',onDismiss:noop}),draw({error,...extra,variant:'marker'}),'markers ignore onDismiss');
  }
  const auth={error:errors[0],onSignIn:noop,signedInAgain:true};
  assert.equal(draw({...auth,onDismiss:noop}),draw(auth),'the settled Signed in again marker ignores onDismiss');
  const css=await readFile(path.resolve(import.meta.dirname,'../src/source-turn-error.css'),'utf8');
  const rules=css.replace(/\/\*[^]*?\*\//g,'').split('}').map(rule=>rule.split('{')[0].trim()).filter(selector=>selector.includes('ste-dismiss'));
  assert.deepEqual(rules,['.ste-dismiss .source-settings-button[data-cds=Button]','.ste-dismiss .source-settings-button[data-cds=Button]:hover'],'only the two scoped colour rules (text-muted / hover:text-primary restated over the unlayered button colour)');
});
const threadFailed=id=>({...failedChild(id,{ownError:null}),errors:{[id]:{message:'Thread-wide failure'}}});
const noticeOf=tree=>findNode(tree,n=>n.type===TurnError.SourceTurnError&&n.props.turnId==='thread');
test('a keyboard Dismiss hides the notice and hands focus to the child composer; a pointer Dismiss leaves focus alone',()=>{
  for(const keyboard of [true,false]){
    const id=`notice-dismiss-${keyboard}`,focused=[],body={},doc={body,activeElement:null};
    const scope={tabIndex:0,focus:()=>focused.push('scope')};
    const control={ownerDocument:doc,isConnected:true,matches:selector=>keyboard&&selector===':focus-visible',closest:selector=>selector==='[data-approval-hotkey-scope]'?scope:null};
    doc.activeElement=keyboard?control:body;
    // c5259f582 pe: the mounted composer's scheduleFocus().
    const input={current:{isConnected:true,scheduleFocus:(...args)=>{focused.push(['scheduleFocus',...args]);doc.activeElement=input.current;return true;},
      focus:()=>assert.fail('pe uses scheduleFocus')}};
    const props={sessionId:id,meta:{btw:{permission:'ask',ownTurnIds:['own']}},thread:{id},state:threadFailed(id),connected:false,input,root:{current:null},onLoad:async()=>{}};
    const f=componentFixture(Pane.SourceBtwContent,props);f.flush();
    const card=noticeOf(f.tree);assert.ok(card,'the thread-wide notice');
    card.props.onDismiss({currentTarget:control});
    control.isConnected=false;if(keyboard)doc.activeElement=body;
    f.render();assert.equal(noticeOf(f.tree),null,'dismissed');f.flush();
    assert.deepEqual(focused,keyboard?[['scheduleFocus']]:[],keyboard?'keyboard':'pointer');
    // The bucket is the session's: another mount of the same child keeps it dismissed.
    const again=componentFixture(Pane.SourceBtwContent,props);assert.equal(noticeOf(again.tree),null);again.close();f.close();
  }
  // No mounted composer: the approval scope takes the focus off the body (nT f fallback).
  const id='notice-dismiss-scope',body={},doc={body,activeElement:null},scope={tabIndex:0,focus(){doc.activeElement=scope;}};
  const control={ownerDocument:doc,isConnected:true,matches:()=>true,closest:()=>scope};doc.activeElement=control;
  const f=componentFixture(Pane.SourceBtwContent,{sessionId:id,meta:{btw:{ownTurnIds:['own']}},thread:{id},state:threadFailed(id),connected:false,input:{current:null},root:{current:null},onLoad:async()=>{}});
  noticeOf(f.tree).props.onDismiss({currentTarget:control});control.isConnected=false;doc.activeElement=body;
  f.render();f.flush();assert.equal(doc.activeElement,scope);assert.equal(scope.tabIndex,-1);f.close();
});
test('a failed send toasts unless that failure put a new session error on screen',async()=>{
  for(const kind of ['plain','new-notice','old-notice']){
    const id=`notice-send-${kind}`,errors=[];let f;
    const s=kind==='old-notice'?threadFailed(id):state();
    const props={sessionId:id,meta:{btw:{permission:'ask',ownTurnIds:['own']}},thread:{id},state:s,connected:true,input:{current:null},root:{current:null},
      onLoad:async()=>{},onError:message=>errors.push(message),
      onSend:async()=>{if(kind==='new-notice'){props.state={...props.state,errors:{[id]:{message:'Rejected'}}};f.render();}throw new Error('send failed');}};
    f=componentFixture(Pane.SourceBtwContent,props);f.flush();Hook.btwDrafts.set(id,'Question');
    const composer=findNode(f.tree,n=>n.props?.placeholder==='Reply in this session…');
    await composer.props.onSubmit();
    assert.deepEqual(errors,kind==='new-notice'?[]:['send failed'],kind);assert.equal(Hook.btwDrafts.get(id),'Question','the draft is restored');f.close();
  }
});
test('the original card-left hook reports only a keyboard decision that left focus inside the card',()=>{
  for(const kind of ['keyboard','modifier','pointer','focus-outside']){
    const left=[],listeners={},doc={body:{},activeElement:null,defaultView:{setTimeout:()=>0}},button={nodeType:1,matches:()=>false};
    const place={ownerDocument:doc,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:type=>{delete listeners[type];},contains:node=>node===button};
    const f=componentFixture(Pane.SourceBtwCardWatch,{place,onLeft:element=>left.push(element)});f.flush();
    assert.deepEqual(Object.keys(listeners).sort(),['focusin','keydown','pointerdown']);
    if(kind==='keyboard')listeners.keydown({key:'Enter'});
    if(kind==='modifier')listeners.keydown({key:'Meta'});
    if(kind==='pointer'){listeners.keydown({key:'Enter'});listeners.pointerdown({});}
    if(kind==='focus-outside')listeners.keydown({key:'Enter'});
    doc.activeElement=kind==='focus-outside'?{}:button;
    f.close();
    assert.deepEqual(left,kind==='keyboard'?[place]:[],kind);assert.deepEqual(Object.keys(listeners),[],`${kind}: listeners removed`);
  }
});
// R4g-btw BT4 (X7-16): one slot for the whole approval area, c96d752d0 $j's qj (generated, shared with the main session).
const slotQuestion=(instanceId,threadId='child')=>({id:instanceId,bridgeApproval:{connectionId:'connection',instanceId},method:'item/tool/requestUserInput',
  params:{threadId,turnId:'own',itemId:`q-${instanceId}`,questions:[{id:'q1',header:'Pick',question:'Which?',isOther:false,isSecret:false,options:[{label:'A',description:'a'}]}]}});
const slotCommand=(instanceId,threadId='child')=>({id:instanceId,bridgeApproval:{connectionId:'connection',instanceId},method:'item/commandExecution/requestApproval',
  params:{threadId,turnId:'own',itemId:`c-${instanceId}`,command:'ls'}});
const answer=(runtime,request)=>runtime.submit(runtime.ticketFor(request),'accept',async()=>({ok:true,identity:request.bridgeApproval}),{getVisibleThreadId:()=>request.params.threadId});
test('the shared slot watches the one drawn card as ${variant}:${id}; an answered tombstone gives way to the next card in the same render',async()=>{
  const command=slotCommand('slot-c'),question=slotQuestion('slot-q'),runtime=createApprovalDraftRuntime();runtime.reconcile([command,question]);
  const props={runtime,requests:[command,question],toComposer:()=>{},renderRequest:r=>React.createElement('section',{key:r.bridgeApproval.instanceId,id:r.bridgeApproval.instanceId})};
  const f=componentFixture(Pane.SourceBtwApprovalSlot,props),parts=()=>f.tree.props.children;
  assert.equal(parts()[0],null,'no watch before the slot element exists');
  const element={};parts()[1].props.ref(element);f.render();
  const [watch,slot]=parts();assert.equal(watch.type,Pane.SourceBtwCardWatch);assert.equal(watch.key,'tool:slot-c');assert.equal(watch.props.place,element);
  assert.deepEqual(slot.props.style,{display:'contents'});assert.deepEqual(slot.props.children[0].map(n=>n.key),['slot-c'],'one card at a time');
  assert.equal(await answer(runtime,command).then(r=>r.status),'answered');f.render();
  assert.equal(parts()[0].key,'ask_user_question:slot-q','the next card is the watched one at once');
  assert.deepEqual(parts()[1].props.children[0].map(n=>n.key),['slot-q'],'the tombstone is left out (the core has not removed it yet)');
  runtime.expire(runtime.ticketFor(question));f.render();
  assert.equal(parts()[0],null,'a request without a live draft is not drawn');
  const handoff=componentFixture(Pane.SourceBtwApprovalSlot,{extraCard:'turn-1',toComposer:()=>{},children:'HANDOFF'});
  handoff.tree.props.children[1].props.ref(element);handoff.render();
  assert.equal(handoff.tree.props.children[0].key,'plan:turn-1','the local Plan handoff is the plan card');assert.equal(handoff.tree.props.children[1].props.children[1],'HANDOFF');
  const off=componentFixture(Pane.SourceBtwApprovalSlot,{runtime,requests:[slotCommand('slot-x')],children:null});
  assert.equal(off.tree.props.children[1].props.ref,undefined,'$j: no onFocusHandBack, no slot (at = Vj() && k !== void 0)');
  const Card=await server.ssrLoadModule('/src/source-approval-card.jsx');
  assert.equal(Card.APPROVAL_LANDING_FLAG,'__gb__1616707004');assert.equal(Card.APPROVAL_LANDING_ON,true);
  assert.deepEqual(Card.approvalLandingOptions('tool'),{takesFocus:true,chordActsAnywhere:false});
  assert.deepEqual(Card.approvalLandingOptions('plan'),{takesFocus:true,chordActsAnywhere:true});
  assert.deepEqual(Card.approvalLandingOptions('tool',{defaultToNo:true}),{takesFocus:false,chordActsAnywhere:false});
  assert.deepEqual(Card.approvalLandingOptions('ask_user_question',{defaultToNo:true}).takesFocus,true);
  assert.deepEqual(Card.approvalLandingOptions(null),{takesFocus:false,chordActsAnywhere:false});
});
// Drive the slot like a commit: the decided card's watch calls qj f (Kj's onLeft, synchronously in the deletion), the next
// render's layout effects run, then f's microtask decides where focus goes.
async function leaveCard({ next = true, draft = false, framed = false, lost = true } = {}) {
  const { fakeWindow } = await import('./fixtures/approval-landing-dom.mjs');
  const { win, doc, element, dispatch } = fakeWindow();
  const scope = element('div'), slotEl = element('div', { style: { display: 'contents' } });scope.append(slotEl);
  const calls = [], composer = element('div');
  composer.focusPreservingSelection = () => { calls.push('focusPreservingSelection'); composer.focus(); };
  composer.ignoreStrayEnter = () => calls.push('ignoreStrayEnter');
  const command = slotCommand(`leave-${next}-${draft}-${framed}-${lost}`), question = slotQuestion(`next-${next}-${draft}-${framed}-${lost}`);
  const runtime = createApprovalDraftRuntime();runtime.reconcile(next ? [command, question] : [command]);
  const props = { runtime, requests: next ? [command, question] : [command], hasDraft: () => draft,
    toComposer: () => { composer.focusPreservingSelection(); composer.ignoreStrayEnter(); }, renderRequest: r => React.createElement('section', { key: r.id }) };
  const f = componentFixture(Pane.SourceBtwApprovalSlot, props);f.tree.props.children[1].props.ref(slotEl);f.render();f.flush();
  if (framed) for (const l of win.listeners.filter(l => l.target === 'document' && l.type === 'focusin')) l.fn({ target: element('iframe') });
  const onLeft = f.tree.props.children[0].props.onLeft, decided = element('button');decided.focus();
  await answer(runtime, command);f.render();
  const card = element('section', { attributes: { 'data-approval-card-root': '', tabindex: '0' }, style: { position: 'relative' } });
  if (next) slotEl.append(card);
  doc.activeElement = lost ? doc.body : decided;
  onLeft(slotEl);f.flush();await Promise.resolve();
  return { win, doc, card, composer, calls, dispatch, scope, f };
}
test('X7-16 qj: a keyboard decision lands focus on the next card with the ring; Gj then holds Enter and sends typing to the composer',async()=>{
  const {afterCardState}=await server.ssrLoadModule('/src/generated/approval-landing/card-landing.mjs');
  const {ringClassesPositioned}=await server.ssrLoadModule('/src/generated/approval-landing/focus-ring.mjs');
  const {win,doc,card,calls,dispatch,scope,composer,f}=await leaveCard();
  assert.equal(doc.activeElement,card,'Hj: the next card root');assert.deepEqual(card.focused,[{focusVisible:true}]);
  assert.ok(ringClassesPositioned.split(' ').every(c=>card.classList.contains(c)),'a positioned card gets the ::after ring (wle)');
  assert.deepEqual(calls,[],'the composer is not involved');
  const state=afterCardState.get(win);assert.equal(state.at,card);assert.equal(state.onCard,true);assert.equal(state.from,scope);
  assert.deepEqual(win.listeners.filter(l=>l.target==='document'&&l.type==='keydown').map(l=>l.capture),[true],'Rre: the document stray-Enter guard');
  const enter=dispatch('keydown',{key:'Enter'});assert.equal(enter.prevented&&enter.stopped,true,'Gj swallows the repeated decision Enter');
  dispatch('keydown',{key:'w'});assert.deepEqual(calls,['focusPreservingSelection','ignoreStrayEnter'],'typing on the landed card goes to the composer');
  assert.equal(doc.activeElement,composer);f.close();
});
test('X7-16 qj: with a draft, nothing next or an unattended window the composer takes focus; focus still somewhere is left alone',async()=>{
  const {afterCardState}=await server.ssrLoadModule('/src/generated/approval-landing/card-landing.mjs');
  for(const [name,options] of [['draft',{draft:true}],['nothing next',{next:false}],['frame',{framed:true}]]){
    const {win,doc,card,composer,calls,dispatch,f}=await leaveCard(options);
    assert.deepEqual(calls,['focusPreservingSelection','ignoreStrayEnter'],name);assert.equal(doc.activeElement,composer,name);
    assert.deepEqual(card.focused,[],`${name}: no landing`);
    const state=afterCardState.get(win);assert.equal(state.at,composer);assert.equal(state.onCard,false);
    assert.equal(dispatch('keydown',{key:'Enter'}).prevented,false,`${name}: Enter is the composer's`);
    assert.equal(dispatch('keydown',{key:'Enter',metaKey:true,shiftKey:true}).prevented,true,`${name}: ⌘⇧⏎ cannot decide the next card`);f.close();
  }
  const {win,card,calls,f}=await leaveCard({lost:false});
  assert.deepEqual(calls,[]);assert.deepEqual(card.focused,[]);assert.equal(afterCardState.has(win),false);f.close();
});
// R3-nested step 3: jT N is the composer's own API now (focusPreservingSelection + ignoreStrayEnter on the editor
// element, R2-composer composer-focus-api.mjs); the pane's own capture-phase Enter guard is gone.
test('a card leaving focus nowhere hands it to the child composer through focusPreservingSelection and ignoreStrayEnter',async()=>{
  const {createComposerFocusApi}=await import('../src/composer-focus-api.mjs');
  for(const lost of [true,false]){
    const id=`handback-${lost}`,s=state();s.items[id]=[{id:'plan',type:'plan',turnId:'own-plan',status:'completed',text:'Child plan'}];
    const calls=[],docListeners=[],body={},doc={body,activeElement:lost?body:{},addEventListener:(...args)=>docListeners.push(args),removeEventListener(){},defaultView:{addEventListener(){},removeEventListener(){},getComputedStyle:()=>({})}};doc.defaultView.document=doc;
    let clock=1000;const api=createComposerFocusApi({dom:{ownerDocument:doc,contains:()=>false},editable:()=>true,nativeFocus(){},placeCaret(){},
      focusView:()=>{calls.push('focusPreservingSelection');doc.activeElement=editor;},now:()=>clock});
    const editor={isConnected:true,focus:()=>assert.fail('not the plain focus()'),
      focusPreservingSelection:()=>api.focusPreservingSelection(),ignoreStrayEnter:()=>{calls.push('ignoreStrayEnter');api.ignoreStrayEnter();}};
    const props={sessionId:id,meta:{btw:{permission:'plan',ownTurnIds:['own-plan']}},thread:{id},state:s,connected:true,input:{current:editor},root:{current:null},
      queueEpoch:'connection:1:codex',onLoad:async()=>{},onImplementPlan:async()=>{},onStayPlan:noop,onError:noop};
    const f=componentFixture(Pane.SourceBtwContent,props);f.flush();await new Promise(resolve=>setImmediate(resolve));f.render();
    const slot=findNode(f.tree,n=>n.type===Pane.SourceBtwApprovalSlot);assert.equal(slot.props.extraCard,'own-plan');
    assert.equal(findNode(slot,n=>n.props?.handoffKey)?.props.handoffKey,`btw:${id}:own-plan`,'the handoff card is inside the slot');
    // R4g-btw BT4: the slot is the generated qj; its watch's onLeft is qj f (no next card here, so the composer takes it).
    const sf=componentFixture(Pane.SourceBtwApprovalSlot,slot.props),place={nodeType:1,ownerDocument:doc,parentElement:{ownerDocument:doc},
      querySelectorAll:()=>[],firstElementChild:null,addEventListener(){},removeEventListener(){}};
    sf.tree.props.children[1].props.ref(place);sf.render();sf.flush();assert.equal(sf.tree.props.children[0].key,'plan:own-plan');
    sf.tree.props.children[0].props.onLeft(place);await Promise.resolve();
    assert.deepEqual(calls,lost?['focusPreservingSelection','ignoreStrayEnter']:[],'jT N in order');
    assert.deepEqual(docListeners.filter(([type])=>type==='keydown').map(([type,,capture])=>[type,capture]),lost?[['keydown',true]]:[],'Rre installs the document stray-Enter guard');
    // The editor's own OP keydown guard: Enter (plain or ⌘) within rP is swallowed, Shift+Enter is not, and rP elapses.
    const key=extra=>api.swallowsEnter({key:'Enter',shiftKey:false,altKey:false,metaKey:false,ctrlKey:false,repeat:false,...extra});
    assert.equal(key(),lost);assert.equal(key({metaKey:true}),lost);assert.equal(key({shiftKey:true}),false);
    clock+=500;assert.equal(key(),false,'rP has elapsed');
    assert.equal(findNode(f.tree,n=>typeof n.props?.onKeyDownCapture==='function'),null,'no pane-level Enter guard any more');
    sf.close();f.close();
  }
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(path.resolve(import.meta.dirname,'../src/source-btw-pane.jsx'),'utf8');
  assert.doesNotMatch(source,/strayEnterUntil|strayEnterWindowMs|onKeyDownCapture/,'the hand-written guard is removed');
  assert.match(source,/node\?\.focusPreservingSelection\?\.\(\);\s*node\?\.ignoreStrayEnter\?\.\(\);/);
  assert.doesNotMatch(source,/const cardLeft|queueMicrotask/,'qj f is the generated original, not a local copy');
});
test('the /btw pane originals are generated from 2.42304.0 and resolve to the expected bindings',async()=>{
  const {extractBtwPane}=await import('../scripts/extract-btw-pane.mjs');const manifest=await extractBtwPane({check:true});
  assert.equal(manifest.referenceVersion,'2.42304.0');
  const hand=manifest.modules.find(m=>m.target==='focus-hand-back.mjs');
  assert.equal(hand.source,'ccf527892-DQjOjuwT.js');assert.deepEqual(hand.bindings.map(b=>b.name),['o']);
  assert.deepEqual(Object.fromEntries(hand.imports.map(i=>[i.via,i.original??`react:${i.name}`])),{
    'vendor-frame-DfPJ1QmD.js:yo':'react:useLayoutEffect','shared-25-DP8p7i1Z.js:Pf':'dp','shared-0-ByI5P0CP.js:xx':'_e',
    'shared-frame-BfjMqbuN.js:fd':'cn','shared-frame-BfjMqbuN.js:vl':'lc','cae42d46f-8Va5mKUX.js:t':'m'});
  assert.deepEqual(manifest.modules.find(m=>m.target==='focus-guard.mjs').bindings.map(b=>b.name),['an','on','sn','cn','lc']);
  assert.deepEqual(manifest.modules.find(m=>m.target==='focus-lost.mjs').exports,{Xw:'focusIsLost'});
});

// R3-nested NBS-4: 2.42304.0 cccc2cf0a RO renderTabMenuItems N → LO, and IO's yield after a Detach from that menu.
test('the side-chat tab menu draws LO: Unpin when pinned, Detach to top level when detachable, else nothing',async()=>{
  const Tabs=await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  const menu=new Map([['both',{pinned:true,detachable:true}],['pin',{pinned:true,detachable:false}],['detach',{pinned:false,detachable:true}],['none',{pinned:false,detachable:false}]]);
  const unpinned=[],detached=[];
  const props={tabs:[...menu.keys()].map(id=>({id})),activeId:'both',state:state(),pending:{},onSelect:noop,onClose:noop,
    menu,onUnpin:id=>unpinned.push(id),onDetach:(id,failed)=>detached.push([id,failed])};
  const f=componentFixture(Pane.SourceBtwTabs,props);f.flush();
  const bar=findNode(f.tree,n=>typeof n.props?.renderTabMenuItems==='function');
  assert.equal(bar.props.minTabWidth,92);assert.equal(bar.props.onReorder,undefined);assert.equal(bar.props.onCreate,undefined,'RO still passes no onReorder/onCreate');
  const items=id=>{const element=bar.props.renderTabMenuItems(id);if(!element)return null;
    const drawn=element.type(element.props);return React.Children.toArray(drawn.props.children);};
  assert.equal(bar.props.renderTabMenuItems('none'),null);assert.equal(bar.props.renderTabMenuItems('unknown'),null,'no menu state, no items');
  const both=items('both');assert.deepEqual(both.map(n=>n.props.children.toString().trim()),['Unpin','Detach to top level'],'LO order');
  assert.ok(both.every(n=>n.type===Tabs.CdsContextMenu.Item),'Qn.Item = shared-frame Ii.Item, the tab menu\'s own Base UI Item');
  assert.deepEqual(items('pin').map(n=>n.props.children),['Unpin']);
  assert.deepEqual(items('detach').map(n=>n.props.children.toString().trim()),['Detach to top level']);
  both[0].props.onClick();assert.deepEqual(unpinned,['both']);
  both[1].props.onClick();assert.equal(detached[0][0],'both');assert.equal(typeof detached[0][1],'function','pf gets the failure callback');
  f.close();
});
test('IO: the active tab detached from this menu with an empty draft yields; a draft, another origin or a failure keeps it',async()=>{
  const run=({draft='',viaMenu=true,fail=false,unknown=false,to=true,again=false})=>{
    const from=unknown?undefined:false;
    const id=`io-${Math.random().toString(36).slice(2)}`;Hook.btwDrafts.set(id,draft);
    const yielded=[],menu=new Map([[id,{pinned:false,detachable:true}]]);
    const props={tabs:[{id}],activeId:id,state:state(),pending:{},onSelect:noop,onClose:noop,menu,activeDetached:from,
      onDetach:(_id,failed)=>{if(fail)failed();},onYield:value=>yielded.push(value)};
    const f=componentFixture(Pane.SourceBtwTabs,props);f.flush();
    if(viaMenu){const bar=findNode(f.tree,n=>typeof n.props?.renderTabMenuItems==='function');const element=bar.props.renderTabMenuItems(id);
      React.Children.toArray(element.type(element.props).props.children)[0].props.onClick();}
    props.activeDetached=to;f.render();f.flush();
    // A second transition never yields twice (the set entry is spent).
    if(again){props.activeDetached=false;f.render();f.flush();props.activeDetached=true;f.render();f.flush();}
    f.close();return yielded;
  };
  assert.equal(run({}).length,1,'false → true after this menu\'s Detach, empty draft');
  assert.equal(run({again:true}).length,1,'once per Detach');
  assert.deepEqual(run({draft:'  keep me '}),[],'a draft keeps the detached tab');
  assert.deepEqual(run({draft:'   '}).length,1,'a whitespace draft is empty (Gh trims)');
  assert.deepEqual(run({viaMenu:false}),[],'a detach from elsewhere (another window, the sidebar) does not move this pane');
  assert.deepEqual(run({fail:true}),[],'a failed detach left the set');
  assert.deepEqual(run({unknown:true}),[],'an unknown record (undefined) to true is not a transition');
  // IO's subscriber runs with the render before the detach, so E (A) looks for neighbours in that strip: the yield
  // carries the pre-detach order, not the re-rendered one where PO has moved the detached active tab last.
  {
    const id='io-order',seenYields=[];Hook.btwDrafts.set(id,'');
    const before=[{id:'a'},{id},{id:'b'},{id:'c'}],after=[{id:'a'},{id:'b'},{id:'c'},{id}];
    const props={tabs:before,activeId:id,state:state(),pending:{},onSelect:noop,onClose:noop,menu:new Map([[id,{pinned:false,detachable:true}]]),
      activeDetached:false,onDetach:noop,onYield:(...args)=>seenYields.push(args)};
    const f=componentFixture(Pane.SourceBtwTabs,props);f.flush();
    const bar=findNode(f.tree,n=>typeof n.props?.renderTabMenuItems==='function');const element=bar.props.renderTabMenuItems(id);
    React.Children.toArray(element.type(element.props).props.children)[0].props.onClick();
    props.tabs=after;props.activeDetached=true;f.render();f.flush();f.close();
    assert.equal(seenYields.length,1);assert.equal(seenYields[0][0],id);assert.equal(seenYields[0][1],before,'the strip as it stood before the detach');
    const {nextBtwTab}=await import('../src/btw-pane-controller.mjs');
    assert.equal(nextBtwTab(seenYields[0][1],id)?.id,'b','E: the next tab of the pre-detach strip');
    assert.equal(nextBtwTab(after,id)?.id,'c','(the re-rendered strip would have picked the last tab instead)');
  }
  // The pane asks main to yield with paneOwnsFocus, like a tab close, and passes the strip order through.
  const yields=[],props={sessionId:'one',meta:{lineageDetached:false},tabs:[{id:'one'}],state:state(),onCloseTab:noop,onSelect:noop,onYieldTab:(...args)=>yields.push(args)};
  const pane=componentFixture(Pane.SourceBtwPane,props);
  const tabs=findNode(pane.tree,n=>n.type===Pane.SourceBtwTabs);assert.equal(tabs.props.activeDetached,false);
  const inside={},doc={activeElement:{},body:{}},order=[{id:'one'}];pane.tree.props.ref.current={ownerDocument:doc,closest:()=>({contains:node=>node===inside})};
  tabs.props.onYield('one',order);doc.activeElement=inside;tabs.props.onYield('one',order);
  assert.deepEqual(yields,[['one',false,order],['one',true,order]],'D() = ey(pane): focus in another pane is kept, focus in this one moves with the tab');
  props.meta=undefined;pane.render();assert.equal(findNode(pane.tree,n=>n.type===Pane.SourceBtwTabs).props.activeDetached,undefined);pane.close();
});
// R4g-btw BT1 (X7-17): c3e34355f draws helpLink as a link of its own and billing through the router, so the official child
// pane's cards show them without any nT prop; the local card's link/settings buttons need the two callbacks.
test('child pane error cards take onOpenLink and onOpenSettings: the notice and the transcript card show their links',async()=>{
  const {readFile}=await import('node:fs/promises');
  const v1=path.resolve(import.meta.dirname,'../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const card=await readFile(path.join(v1,'c3e34355f-DqW-8zts.js'),'utf8'),count=(text,needle)=>text.split(needle).length-1;
  assert.equal(count(card,'bn=Y.helpLink?.href'),1);assert.equal(count(card,'a(ye,{href:bn,external:"with-icon"'),1);
  assert.equal(count(card,'Yt("/settings/billing")'),1);assert.equal(count(card,'Yt=ke()'),1);
  const id='notice-links',opened=[],settings=[];
  const onOpenLink=url=>opened.push(url),onOpenSettings=page=>settings.push(page);
  const thread={...failedChild(id,{ownError:null}),errors:{[id]:{message:'bad key',codexErrorInfo:'unauthorized',additionalDetails:'AUTH'}}};
  const props={sessionId:id,meta:{btw:{permission:'ask',ownTurnIds:['own']}},thread:{id},tabs:[{id}],state:thread,connected:true,
    onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop};
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props)),/>Open settings</,'without the callback (before BT1)');
  assert.match(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,onOpenLink,onOpenSettings})),/data-turn-id="thread"[^]*>Open settings</);
  const f=componentFixture(Pane.SourceBtwContent,{...props,onOpenLink,onOpenSettings,input:{current:null},root:{current:null},connected:false});
  const notice=noticeOf(f.tree);notice.props.onOpenSettings('models');notice.props.onOpenLink('https://x.test/notice');f.close();
  assert.deepEqual([settings,opened],[['models'],['https://x.test/notice']]);
  // A safety refusal in the child's own turn: the transcript card's Learn more.
  const refused=failedChild(id,{ownError:{message:'refused',codexErrorInfo:'cyberPolicy'}});
  const html=renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:refused,onOpenLink,onOpenSettings}));
  assert.match(html,/data-turn-error="card" data-turn-id="own"[^]*>Learn more</);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:refused})),/>Learn more</);
  const g=componentFixture(Pane.SourceBtwContent,{...props,state:refused,onOpenLink,onOpenSettings,input:{current:null},root:{current:null},connected:false});
  const own=findNode(g.tree,n=>n.type===TurnError.SourceTurnError&&n.props.turnId==='own');own.props.onOpenLink('https://x.test/own');g.close();
  assert.deepEqual(opened,['https://x.test/notice','https://x.test/own']);
  assert.doesNotMatch(html,/>Try again<|>Compact session<|>View usage</,'still no retry, compact or usage report in the child pane');
});
// R4g-btw BT1 (X7-18): the official child composer takes no attachments, and the local one is wired the same.
test('the child pane composer, as the official jT one, takes no pasted or dropped attachments',async()=>{
  const {readFile}=await import('node:fs/promises');
  const v1=path.resolve(import.meta.dirname,'../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const pane=await readFile(path.join(v1,'cccc2cf0a-B0D--VZp.js'),'utf8'),shell=await readFile(path.join(v1,'c227f4d5e-Ba-r--Rl.js'),'utf8');
  const count=(text,needle)=>text.split(needle).length-1;
  const call='g(us,{ref:m,initialValue:R,onChange:z,draftPersisted:!0,onSubmit:H,busy:a?.isRunning===!0,interrupting:c,onStop:ee,isPanelActive:te,enableQueueVsSteer:p,placeholder:n.formatMessage({defaultMessage:"Reply in this session\\u2026",id:"YZJzyEQEIv"})})';
  assert.equal(count(pane,call),1,'jT passes the composer no onPaste / onPageFileDrop / onAddFiles / attachmentStrip');
  assert.equal(count(pane,'Io as us'),1);assert.equal(count(shell,'kP as Io'),1);assert.equal(count(shell,'var kP=B(OP)'),1);
  assert.equal(count(shell,'"data-bash-mode":U?"true":void 0,[Rt]:e,onPaste:Te'),1,'uM: onPaste only as given');
  assert.equal(count(shell,'onFileDrop:Ee,dropScope:Ee&&"page"'),1,'uM: page drop only with onPageFileDrop');
  assert.equal(count(shell,'ft=De==null&&Se!==void 0?D(Oj,{onAddFiles:Se'),1,'uM: the + only with onAddFiles');
  const local=await readFile(path.resolve(import.meta.dirname,'../src/source-btw-pane.jsx'),'utf8');
  const composer=local.slice(local.indexOf('<SourceComposer key={sessionId}'),local.indexOf('folderMenu={false}/>'));
  assert.ok(composer.length>0);assert.doesNotMatch(composer,/onStageFiles|onAddFolders/);
});
// R4i-transcript TR2 (btw-error-01): the official child pane's transcript card is c227f4d5e OW without MW, i.e. TW — no
// retry, compact, fallback, mode or usage-report callbacks — while the card's own actions (links by href, billing through
// the router) stay. The host's own session-independent action (Open config) follows the links; the child's model picks
// the cyber notice; an older failure's marker takes no callbacks, as in the main transcript.
test('TR2: child error cards take onEditConfig and the child model on the card only; markers get no callbacks',async()=>{
  const {readFile}=await import('node:fs/promises');
  const v1=path.resolve(import.meta.dirname,'../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const shell=await readFile(path.join(v1,'c227f4d5e-Ba-r--Rl.js'),'utf8'),count=(text,needle)=>text.split(needle).length-1;
  assert.equal(count(shell,'TW={onRetryLastTurn:void 0,canSendMessage:!1,onCompactLastTurn:void 0,fallbackModelLabel:void 0,onRetryWithFallback:void 0,onSwitchToAuto:void 0,onChangeMode:void 0,sessionReportsAutoMode:!1,retryModelItems:void 0,retryModelLabel:null,onShowUsageReport:void 0}'),1);
  assert.equal(count(shell,'function OW(){let e=P(EW),t=e?.scopeStore??DW,'),1);assert.equal(count(shell,'if(e===null)return TW;'),1);
  const id='tr2-child',noop2=()=>{},edits=[];
  const budget=failedChild(id,{ownError:{message:'budget',codexErrorInfo:'sessionBudgetExceeded'}});
  const props={sessionId:id,meta:{model:'gpt-5.6-sol',btw:{permission:'ask',ownTurnIds:['own']}},thread:{id},tabs:[{id}],state:budget,connected:true,
    onLoad:noop,onSend:noop,onStop:noop,onSelect:noop,onCloseTab:noop,onError:noop,onOpenLink:noop2,onOpenSettings:noop2};
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,props)),/>Open config</,'no callback, no button');
  const onEditConfig=()=>edits.push('config');
  assert.match(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,onEditConfig})),/data-turn-error="card" data-turn-id="own"[^]*>Open config</);
  const f=componentFixture(Pane.SourceBtwContent,{...props,onEditConfig,input:{current:null},root:{current:null},connected:false});
  const card=findNode(f.tree,n=>n.type===TurnError.SourceTurnError&&n.props.turnId==='own');
  assert.equal(card.props.model,'gpt-5.6-sol');card.props.onEditConfig();f.close();assert.deepEqual(edits,['config']);
  // The child's own model chooses the cyber notice (Daybreak's Apply only for gpt-5.6-sol).
  const refused=failedChild(id,{ownError:{message:'refused',codexErrorInfo:'cyberPolicy'}});
  assert.match(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:refused})),/>Apply for Daybreak</);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,meta:{...props.meta,model:'other'},state:refused})),/>Apply for Daybreak</);
  // The session notice (nT) is a card too: it takes the same pair.
  const thread={...failedChild(id,{ownError:null}),errors:{[id]:{message:'budget',codexErrorInfo:'sessionBudgetExceeded'}}};
  assert.match(renderToStaticMarkup(React.createElement(Pane.SourceBtwPane,{...props,state:thread,onEditConfig})),/data-turn-id="thread"[^]*>Open config</);
  // An older own failure is a marker: no callbacks reach it.
  const two=failedChild(id);two.turnErrors[id].own2={message:'Second failure',codexErrorInfo:'serverOverloaded'};
  two.items[id].push({id:'second-user',type:'userMessage',turnId:'own2',content:[{type:'text',text:'Again'}]});
  const g=componentFixture(Pane.SourceBtwContent,{...props,onEditConfig,meta:{...props.meta,btw:{permission:'ask',ownTurnIds:['own','own2']}},state:two,input:{current:null},root:{current:null},connected:false});
  const marker=findNode(g.tree,n=>n.type===TurnError.SourceTurnError&&n.props.turnId==='own'),newest=findNode(g.tree,n=>n.type===TurnError.SourceTurnError&&n.props.turnId==='own2');g.close();
  assert.equal(marker.props.variant,'marker');
  assert.deepEqual([marker.props.onOpenLink,marker.props.onOpenSettings,marker.props.onEditConfig],[undefined,undefined,undefined]);
  assert.equal(newest.props.variant,'card');assert.equal(typeof newest.props.onOpenLink,'function');assert.equal(typeof newest.props.onEditConfig,'function');
  // main.jsx passes the same Open config as the main card, gated on a live core.
  const main=await readFile(path.resolve(import.meta.dirname,'../src/main.jsx'),'utf8');
  const mount=main.slice(main.indexOf('<SourceBtwPane key={current}'),main.indexOf('controls={PANE_WINDOW ? <SourcePopoutControls paneName={PANE_NAMES.session}')); // R4i-transcript TR3: the /btw popout's controls
  assert.equal(count(mount,'onEditConfig={boot?.connected ? () => call("desktop-edit-config").catch(actionFailed("open-config")) : undefined}'),1);
});
