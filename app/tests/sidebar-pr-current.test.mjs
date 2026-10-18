import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { aggregatePullRequests, pullRequestEntries } from '../src/generated/code-current/sidebar-pr-model.mjs';
import { currentSidebarPullRequest } from '../src/sidebar-pr-current-model.mjs';
import { currentSidebarSession } from '../src/sidebar-session-current-model.mjs';
import { parsePullRequest, PR_FIELDS } from '../electron/git-pull-request.cjs';

let server, Card, Preview, Icons, Sidebar;
before(async () => {
  server = await createServer({ configFile:false, root:new URL('..',import.meta.url).pathname, plugins:[react()],
    server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error' });
  Card = await server.ssrLoadModule('/src/generated/code-current/sidebar-pr-card.mjs');
  Preview = await server.ssrLoadModule('/src/generated/view-tabs/shared-156-Bikz018e.js');
  Icons = await server.ssrLoadModule('/src/generated/code-current/sidebar-pr-icon.mjs');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
});
after(() => server?.close());
const record = fields => ({repo:'acme/widget',number:12,state:'open',url:'https://github.com/acme/widget/pull/12',...fields});
const thread = fields => ({id:'row',name:'A task',cwd:'/repo',createdAt:1,updatedAt:1,...fields});
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component,props));

test('original PR aggregation chooses the worst state and its checks, independently of entry order', () => {
  const records = [record({state:'merged'}),record({number:13,state:'open',reviewDecision:'APPROVED',ciState:'failed'}),
    record({number:14,hasConflict:true,ciState:'pending'}),record({number:15,hasConflict:true,ciState:'failed'})];
  for (const list of [records,[...records].reverse()]) {
    const result = aggregatePullRequests(list);
    assert.equal(result.displayState,'conflicting'); assert.equal(result.ciState,'failed');
    assert.equal(result.prNumber,undefined); assert.equal(result.displayPrs.length,2);
  }
  assert.equal(aggregatePullRequests([record({reviewDecision:'CHANGES_REQUESTED',hasConflict:true})]).displayState,'changesRequested');
  assert.equal(aggregatePullRequests([]).displayState,'none');
});

test('original hover entries deduplicate repository/number, retain other repositories and strip unsafe links', () => {
  const input=[record({state:'merged'}),record({repo:'ACME/Widget',state:'open'}),record({repo:'acme/other',state:'draft'}),
    record({number:14,state:'conflicting',url:'javascript:alert(1)'}),record({number:15,state:'none'})];
  const entries=pullRequestEntries(aggregatePullRequests(input));
  assert.deepEqual(entries.map(e=>[e.repo,e.number,e.state]),[['acme/widget',14,'conflicting'],['acme/other',12,'draft'],['acme/widget',12,'merged']]);
  assert.equal(entries[0].url,undefined); assert.equal(input[0].state,'merged');
});

test('local observed PR wins over cached state, projects real fields, and maps skipped checks to passed', () => {
  const view=currentSidebarPullRequest(thread({prState:'open',prInfo:record({state:'merged',title:'Ship it',ci:'skipped',additions:8,deletions:0})}));
  assert.equal(view.state,'merged'); assert.equal(view.count,1);
  assert.deepEqual(view.entries,[record({state:'merged',title:'Ship it',ciState:'passed',additions:8,deletions:0})]);
  assert.equal(currentSidebarPullRequest(thread({prState:'unexpected'})),undefined);
  assert.equal(currentSidebarPullRequest(thread({prState:'none',codeDesktop:{pr:record()}})),undefined);
  assert.equal(currentSidebarPullRequest(thread()),undefined);
});

test('cached engine records infer repository identity from their actual link and tolerate absent optional fields', () => {
  const view=currentSidebarPullRequest(thread({codeDesktop:{pr:{url:'https://github.example.org/team/repo/pull/23',number:23}}}));
  assert.equal(view.state,'open'); assert.equal(view.entries[0].repo,'team/repo'); assert.equal(view.entries[0].number,23);
  assert.equal(view.entries[0].title,undefined);
  const fallback=currentSidebarPullRequest(thread({prState:'draft'}));
  assert.equal(fallback.state,'draft'); assert.deepEqual(fallback.entries,[]);
  assert.deepEqual(currentSidebarPullRequest(thread({prState:'open',prLink:'javascript:alert(1)'})).entries,[]);
});

test('archived and hidden-PR rows suppress the card while unread remains an independent state', () => {
  const session=thread({prInfo:record({state:'merged'}),isUnread:true});
  assert.equal(currentSidebarSession(session).mark,'ready'); assert.equal(currentSidebarSession(session).pr.state,'merged');
  assert.equal(currentSidebarSession({...session,archived:true}).pr,undefined);
  assert.equal(currentSidebarSession(session,{}, {},{showPrStatus:false}).pr,undefined);
});

test('read-only PR lookup requests and validates additions/deletions for the original card', () => {
  const fields=PR_FIELDS.split(','); assert.ok(fields.includes('additions')); assert.ok(fields.includes('deletions'));
  const input={...record(),state:'OPEN',additions:5,deletions:0};
  const parsed=parsePullRequest(input); assert.equal(parsed.additions,5); assert.equal(parsed.deletions,0);
  const invalid=parsePullRequest({...input,additions:-1,deletions:'3'});
  assert.equal(invalid.additions,undefined); assert.equal(invalid.deletions,undefined);
});

test('all shipped PR states use their own source glyph, color and 12px sizing', () => {
  for(const [state,appearance] of Object.entries(Icons.sidebarPrAppearance)) {
    const html=render(Icons.SidebarPrIcon,{state});
    assert.ok(html.includes(`color:${appearance.color}`),state);
    assert.match(html,/font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)/);
    assert.doesNotMatch(html,/customSize=|bold=|alt=/);
  }
  const accessible=render(Icons.SidebarPrIcon,{state:'merged',alt:'Merged pull request'});
  assert.match(accessible,/role="img" aria-label="Merged pull request"/); assert.doesNotMatch(accessible,/aria-hidden/);
});

test('original preview entry renders the title, repository, number, check state and signed diff counts', () => {
  const html=render(Card.SidebarPrEntry,{entry:record({title:'<Fix the parser>',ciState:'failed',additions:9,deletions:2})});
  assert.match(html,/href="https:\/\/github.com\/acme\/widget\/pull\/12" target="_blank" rel="noopener noreferrer"/);
  for(const content of ['&lt;Fix the parser&gt;','Checks failed','acme/widget','#12','+9','−2']) assert.ok(html.includes(content),content);
  const draft=render(Card.SidebarPrEntry,{entry:record({state:'draft',ciState:'failed'})});
  assert.match(draft,/>Draft</); assert.doesNotMatch(draft,/Checks failed/);
  const nonlink=render(Card.SidebarPrEntry,{entry:record({url:undefined})}); assert.doesNotMatch(nonlink,/<a /);
});

test('original title glyph shows a multi-PR count, keeps the single icon compact and mounts no eager popup', () => {
  const entries=[record(),record({repo:'acme/other'})];
  const many=render(Card.SidebarPrGlyph,{pr:{state:'open',count:2,entries},place:'title'});
  assert.match(many,/data-pr-glyph="open"/); assert.match(many,/tabular-nums">2<\/span>/);
  assert.doesNotMatch(many,/data-cds="PreviewCard"/);
  const one=render(Card.SidebarPrGlyph,{pr:{state:'draft',count:1,entries:entries.slice(0,1)},place:'title'});
  assert.doesNotMatch(one,/tabular-nums/);
});

test('real sidebar rows connect the original glyph/card and keyboard control; pinned and archived rows omit it', () => {
  const session=thread({prInfo:record({state:'merged'})});
  const html=render(Sidebar.SourceSidebar,{sessions:[session],knownFolders:['/repo']});
  assert.match(html,/shrink-0 flex items-center gap-1.5 text-xs text-muted/); assert.match(html,/data-pr-glyph="merged"/);
  assert.match(html,/<button[^>]*data-row-action=""[^>]*tabindex="-1"|<button[^>]*tabindex="-1"[^>]*data-row-action=""/); assert.match(html,/data-find-omitted=""> Merged<\/span>/);
  for(const props of [{sessionMetadata:{row:{pinned:true}}},{sessions:[{...session,archived:true}],sidebarPreferences:{showArchived:true}}]) {
    const hidden=render(Sidebar.SourceSidebar,{sessions:[session],knownFolders:['/repo'],...props});
    assert.doesNotMatch(hidden,/data-pr-glyph=/);
  }
});

// Run the original functions with controlled hooks/events, without a browser
// or a connection to any desktop, GitHub or model service.
function fixture(component, props, contexts=new Map()) {
  const cells=[],effects=[]; let cursor=0,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={
    useContext:c=>contexts.has(c)?contexts.get(c):c._currentValue,
    useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next;}];},
    useRef(initial){return hooks.useState(()=>({current:initial}))[0];},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useId(){return hooks.useMemo(()=>`pr-fixture-${cursor}`,[]);},
    useEffectEvent(fn){const ref=hooks.useRef(fn);ref.current=fn;return hooks.useMemo(()=>(...args)=>ref.current(...args),[]);},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}},
  }; hooks.useLayoutEffect=hooks.useEffect;
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internal.H;
    internal.H=hooks;try{tree=component(props);return tree;}finally{internal.H=previous;}};
  render(); return {render,get tree(){return tree;},flush(){for(const effect of effects.splice(0))effect();},close(){for(const cell of cells)cell?.cleanup?.();}};
}

test('original card retains 250ms delay, hover handlers, menu suppression, event containment and close notification', () => {
  const calls=[],context={menuOpen:false,onPrCardOpenChange:value=>calls.push(value)},contexts=new Map([[Card.SidebarPrCardContext,context]]);
  const props={entries:[record()],children:React.createElement('span',{onPointerEnter:()=>calls.push('enter')})};
  const f=fixture(Card.SidebarPrCard,props,contexts); f.flush();
  assert.equal(f.tree.type,Preview.CdsPreviewCard.Root); assert.equal(f.tree.props.delay,250); assert.equal(f.tree.props.lazy,true);
  const [trigger,popup]=f.tree.props.children;
  trigger.props.render.props.onPointerEnter({currentTarget:{contains:()=>true},target:{}}); assert.deepEqual(calls,['enter']);
  f.render(); assert.equal(f.tree.props.disabled,false);
  f.tree.props.onOpenChange(true); assert.deepEqual(calls,['enter',true]);
  context.menuOpen=true; f.render(); assert.equal(f.tree.props.disabled,true);
  context.menuOpen=false; context.rowCardOpen=true; f.render(); assert.equal(f.tree.props.disabled,true);
  assert.equal(popup.props.side,'right'); assert.deepEqual(popup.props.collisionPadding,{top:48,right:8,bottom:8,left:8});
  let stops=0; for(const handler of ['onClick','onDoubleClick','onPointerDown'])popup.props[handler]({stopPropagation(){stops++;}});
  assert.equal(stops,3); f.close(); assert.equal(calls.at(-1),false);
});

test('covered More control opens its PR card by keyboard but disables hover over that same control', () => {
  const cover=Card.sidebarPrCoveredControl({entries:[record()]});
  const tree=cover(React.createElement('button',{'data-row-action':''},'More'));
  assert.equal(tree.props.keyboardOnly,true);
  const f=fixture(tree.type,tree.props);
  const enter=f.tree.props.children[0].props.render.props.onPointerEnter;
  enter({currentTarget:{contains:()=>true},target:{}}); f.render(); assert.equal(f.tree.props.disabled,true);
  f.tree.props.children[0].props.render.props.onPointerLeave(); f.render(); assert.equal(f.tree.props.disabled,false);
  assert.equal(Card.sidebarPrCoveredControl({entries:[]}),undefined); f.close();
});

test('original preview trigger preserves focus-visible opening and transfers focus state into the card', () => {
  const focused=[],popupFocused=[],popup={},context={...Preview.CdsPreviewCardContext._currentValue,
    setFocused:value=>focused.push(value),setPopupFocused:value=>popupFocused.push(value),popupNodeRef:{current:popup}};
  const f=fixture(Preview.CdsPreviewCardTrigger,{render:React.createElement('span')},new Map([[Preview.CdsPreviewCardContext,context]]));
  f.tree.props.onFocus({target:{matches:()=>true},nativeEvent:{}}); assert.deepEqual(focused,[true]);
  f.tree.props.onBlur({relatedTarget:{closest:()=>popup}}); assert.deepEqual(focused,[true,false]); assert.deepEqual(popupFocused,[true]);
  context.disabled=true; f.render(); f.tree.props.onFocus({target:{matches:()=>true},nativeEvent:{}}); assert.deepEqual(focused,[true,false]); f.close();
});
