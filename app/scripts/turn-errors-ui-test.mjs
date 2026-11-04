import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Failed turns end to end: scroll-messages-current.js:56485-56503 (newest error
// of the last entry -> ehe/YY card, others -> JY/uJ marker 32289-32330),
// cf6ae6197 Bp card + Rp details, c1298b0ba Z copy, classic Y5 apiRetry status
// row (58388/58545). Real main/preload/IPC with the isolated protocol fixture:
// ErrorNotification willRetry true/false and TurnCompleted status "failed".
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'turn-errors-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});
const now=Math.floor(Date.now()/1000),RC='turn-errors-session';
const seeded={id:RC,name:'Turn errors',cwd:workspace,historyMode:'paginated',createdAt:now,updatedAt:now,archived:false,turns:[{id:'seed-turn',status:'completed',items:[{id:'seed-user',type:'userMessage',content:[{type:'text',text:'Seeded prompt.',text_elements:[]}]},{id:'seed-answer',type:'agentMessage',text:'SEEDED_ANSWER'}]}]};
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:[RC],sidebarWidth:288,displayName:'Fixture'}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[RC]:seeded}}));
// Long enough to observe the retry row; the failure itself is a real notification.
await fs.writeFile(path.join(profile,'fixture-turn-error.json'),JSON.stringify({retryMs:2500}));
const read=async name=>JSON.parse(await fs.readFile(path.join(profile,name),'utf8'));
const requests=async()=>String(await fs.readFile(path.join(profile,'fixture-requests.jsonl'))).trim().split('\n').map(JSON.parse);
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/main.jsx','src/state.js','src/turn-error-model.mjs','src/source-turn-error.jsx','src/source-turn-error.css','src/source-transcript-status.jsx','src/transcript-status-model.mjs','src/source-disclosure.jsx'])assert.ok(build.sources.some(entry=>entry.path===required),'build identifies '+required);
 const h=sha(await fs.readFile(path.join(root,'scripts/turn-errors-ui-test.mjs'))+await fs.readFile(path.join(root,'tests/fixtures/codex-server.cjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('TURN-ERRORS '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const composer=()=>page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });
const glyphs=JSON.parse(await fs.readFile(path.join(root,'src/generated/icons.json'),'utf8'));
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324);
 await composer().waitFor();await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.getByText('SEEDED_ANSWER',{exact:true}).waitFor();}
async function send(text){await composer().fill(text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();}
const errors=()=>page.locator('[data-turn-error]');
const inlineAlerts=()=>page.locator('[role=alert].inline-error');
// Screenshots wait for every open details panel to finish its measured height transition.
const settled=()=>poll(()=>page.evaluate(()=>[...document.querySelectorAll('.ste-details > .source-disclosure-panel')].every(p=>{const c=p.firstElementChild;return !c||Math.abs(p.getBoundingClientRect().height-(p.getAttribute('aria-hidden')?0:c.getBoundingClientRect().height))<0.5;})),'details panels settled');
async function shot(name){await settled();await page.screenshot({path:path.join(directory,name+'.png')});}
// Measures one CDS token in the card's own cascade (density / data-size scope).
const token=(locator,value)=>locator.evaluate((node,value)=>{const probe=document.createElement('div');probe.style.cssText=`position:absolute;visibility:hidden;padding-left:${value}`;node.parentElement.append(probe);const px=getComputedStyle(probe).paddingLeft;probe.remove();return px;},value);
const overflow=()=>page.evaluate(()=>({doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth,transcript:[...document.querySelectorAll('.source-transcript-content')].map(n=>n.scrollWidth-n.clientWidth)}));
// DOM order: the error surface is inside its turn, after that turn's rows and before anything newer.
const orderAfter=(error,text)=>error.evaluate((node,text)=>{const rows=[...document.querySelectorAll('.source-transcript-content .source-message')];const at=rows.indexOf(node);const anchor=rows.findLastIndex(row=>row.textContent.includes(text));return {at,anchor,next:rows[at+1]?.dataset.turnError??rows[at+1]?.className??null};},text);
try{
 await integrity();await launch();
 step('retrying');await send('fixture:turn-error:usage');
 const row=page.locator('[data-testid="code-transcript-status"]');
 await row.locator('[data-retrying]').filter({hasText:'Retrying…'}).waitFor();
 const retryRow=await row.evaluate(node=>({phase:node.dataset.transcriptStatus,error:node.querySelector('[data-retry-error]')?.textContent,label:node.querySelector('.sts-label')?.getAttribute('aria-label'),shimmer:!!node.querySelector('.source-shimmer'),tokens:!!node.querySelector('[data-runtime-stat="tokens"]'),font:getComputedStyle(node.querySelector('[data-retrying]')).fontSize,color:getComputedStyle(node.querySelector('.sts-label')).color}));
 report.metrics.retryRow=retryRow;assert.deepEqual([retryRow.phase,retryRow.error,retryRow.label,retryRow.shimmer,retryRow.tokens],['running','Rate limited','Rate limited · Retrying…',false,false]);
 assert.equal(await inlineAlerts().count(),0,'willRetry never renders the red alert');assert.equal(await errors().count(),0,'willRetry never renders an error card');
 await shot('retrying-light');report.checks.push('ErrorNotification willRetry:true shows "Rate limited · Retrying…" in the status row (no shimmer, no token stat), no inline alert and no card');
 step('failed-card');const card=page.locator('[data-turn-error="card"]');await card.waitFor({timeout:12000});
 await poll(async()=>await row.locator('[data-retrying]').count()===0,'retry row cleared');assert.equal(await inlineAlerts().count(),0);
 const cardView=await card.evaluate(node=>{const s=getComputedStyle(node),icon=node.querySelector('.ste-header [data-cds=Icon]'),headline=node.querySelector('.ste-headline');return {category:node.dataset.errorCategory,headline:headline.textContent,hint:node.querySelector('.ste-hint').textContent,icon:icon.textContent.codePointAt(0),iconColor:getComputedStyle(icon).color,iconSize:getComputedStyle(icon).fontSize,headlineWeight:getComputedStyle(headline).fontWeight,
  minWidth:s.minWidth,maxWidth:s.maxWidth,width:node.getBoundingClientRect().width,parent:node.parentElement.getBoundingClientRect().width,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],gap:s.rowGap,radius:s.borderRadius,shadow:s.boxShadow,userSelect:s.userSelect};});
 report.metrics.card=cardView;
 // source-turn-error.jsx usageLimitView: Codex's own usage-limit text (upgrade / credits / reset time) replaces the generic hint,
 // and a non-per-token core adds View usage (Settings › Usage) beside Try again.
 assert.deepEqual([cardView.category,cardView.headline,cardView.hint],['rate_limit','Usage limit reached',"You've hit your usage limit. Upgrade to Pro, or try again at 3:05 PM."]);
 assert.equal(await card.getByRole('button',{name:'View usage'}).count(),1,'usage-limit card links to Settings › Usage');
 assert.equal(cardView.icon,glyphs.UsageGaugeHigh);assert.equal(cardView.iconSize,'16px');assert.equal(cardView.headlineWeight,'500');
 assert.equal(cardView.minWidth,'min(480px, 100%)');assert.equal(cardView.maxWidth,'100%');assert.ok(cardView.width>=Math.min(480,cardView.parent)-0.5&&cardView.width<=cardView.parent+0.5,'min(480px,100%) <= width <= parent');
 const padLg=await token(card,'var(--cds-pad-lg)'),gapMd=await token(card,'var(--cds-gap-md)'),radiusLg=await token(card,'var(--radius-lg)');report.metrics.tokens={padLg,gapMd,radiusLg};
 assert.deepEqual(cardView.padding,[padLg,padLg,padLg,padLg]);assert.equal(cardView.gap,gapMd);assert.equal(cardView.radius,radiusLg);assert.match(cardView.shadow,/inset/);assert.equal(cardView.userSelect,'text');
 assert.equal(cardView.iconColor,await card.evaluate(node=>{const p=document.createElement('span');p.style.color='var(--cds-text-danger)';node.append(p);const c=getComputedStyle(p).color;p.remove();return c;}));
 const cardOrder=await orderAfter(card,'fixture:turn-error:usage');report.metrics.cardOrder=cardOrder;assert.equal(cardOrder.at,cardOrder.anchor+1,'card directly follows its turn rows');
 assert.equal(await card.evaluate(node=>node.nextElementSibling?.dataset.testid),'code-transcript-status');
 const details=card.getByRole('button',{name:'View details'});assert.equal(await details.getAttribute('aria-expanded'),'false');
 assert.equal(await card.getByText('FIXTURE_USAGE_DETAILS',{exact:false}).count(),0);
 await details.click();await card.getByText('FIXTURE_USAGE_DETAILS plan=plus window=5h',{exact:false}).waitFor();assert.equal(await details.getAttribute('aria-expanded'),'true');
 const detailText=await card.locator('.ste-details-text').textContent();assert.equal(detailText,"You've hit your usage limit. Upgrade to Pro, or try again at 3:05 PM.\n\nFIXTURE_USAGE_DETAILS plan=plus window=5h");
 assert.equal(await card.getByRole('button',{name:'Copy details'}).count(),1);
 const panelFirst=await card.evaluate(node=>{const root=node.querySelector('.ste-details'),panel=root.querySelector('.source-disclosure-panel'),trigger=root.querySelector('.ste-details-trigger');return panel.getBoundingClientRect().bottom<=trigger.getBoundingClientRect().top+0.5&&getComputedStyle(trigger).fontSize;});
 assert.equal(panelFirst,await card.evaluate(node=>{const p=document.createElement('span');p.style.fontSize='var(--cds-font-size-footnote)';node.append(p);const f=getComputedStyle(p).fontSize;p.remove();return f;}),'details panel sits above the footnote trigger (order-first)');
 await shot('failed-card-light');report.metrics.lightOverflow=await overflow();assert.equal(report.metrics.lightOverflow.doc,0);assert.equal(report.metrics.lightOverflow.body,0);
 report.checks.push('TurnCompleted failed (usageLimitExceeded) renders the source card after the turn: usage icon, Usage limit reached, Codex’s own limit text as the hint, View usage, min(480px,100%), p-lg/gap-md/rounded-lg tokens, inset outline, View details with message + additionalDetails above the trigger, Copy details present (not clicked)');
 step('try-again');const retryButton=card.getByRole('button',{name:'Try again'});await retryButton.waitFor();const before=(await requests()).filter(r=>r.method==='turn/start').length;
 await retryButton.click();await poll(async()=>(await requests()).filter(r=>r.method==='turn/start').length===before+1,'retry turn/start');
 const resent=(await requests()).filter(r=>r.method==='turn/start').at(-1).params;assert.equal(resent.threadId,RC);assert.deepEqual(resent.input.map(part=>[part.type,part.text]),[['text','fixture:turn-error:usage']]);
 await row.locator('[data-retrying]').waitFor();assert.equal(await page.locator('[data-turn-error="card"]').count(),0,'running newer turn demotes the card');
 await page.locator('[data-turn-error="marker"]').first().waitFor();await page.locator('[data-turn-error="card"]').waitFor({timeout:12000});
 report.checks.push('Try again resends the failed turn’s own text through turn/start; while the new turn runs the old failure is a marker, then the new failure owns the card');
 step('second-failure');await send('fixture:turn-error:other');await page.getByText('Partial answer before the failure.',{exact:true}).waitFor();
 await poll(async()=>await page.locator('[data-turn-error="card"][data-error-category="unknown"]').count()===1,'other failure card',12000);
 assert.deepEqual(await errors().evaluateAll(nodes=>nodes.map(n=>[n.dataset.turnError,n.dataset.errorCategory])),[['marker','rate_limit'],['marker','rate_limit'],['card','unknown']]);
 const marker=page.locator('[data-turn-error="marker"]').first();
 const markerView=await marker.evaluate(node=>{const s=getComputedStyle(node),row=node.querySelector('.ste-marker-row'),icon=row.querySelector('[data-cds=Icon]');return {label:node.querySelector('.ste-marker-label').textContent,maxWidth:s.maxWidth,width:node.getBoundingClientRect().width,gap:s.rowGap,rowGap:getComputedStyle(row).columnGap,icon:icon.textContent.codePointAt(0),labelColor:getComputedStyle(node.querySelector('.ste-marker-label')).color,hint:!!node.querySelector('.ste-hint'),padding:s.paddingTop};});
 report.metrics.marker=markerView;assert.deepEqual([markerView.label,markerView.maxWidth,markerView.gap,markerView.rowGap,markerView.icon,markerView.hint,markerView.padding],['Usage limit reached','480px','4px','5px',glyphs.UsageGaugeHigh,false,'0px']);assert.ok(markerView.width<=480.5);
 await marker.getByRole('button',{name:'View details'}).click();await marker.getByText('FIXTURE_USAGE_DETAILS',{exact:false}).waitFor();
 const other=page.locator('[data-turn-error="card"]');assert.equal(await other.locator('.ste-headline').textContent(),'An API error occurred');assert.equal(await other.locator('.ste-hint').textContent(),'Try sending your message again.');
 assert.equal((await orderAfter(other,'Partial answer before the failure.')).at,(await orderAfter(other,'Partial answer before the failure.')).anchor+1,'card follows the partial reply of its turn');
 assert.equal(await other.locator('.ste-header [data-cds=Icon]').evaluate(n=>n.textContent.codePointAt(0)),glyphs.Warning);
 assert.equal(await other.getByRole('button',{name:'Try again'}).count(),1);assert.equal(await inlineAlerts().count(),0);
 await shot('marker-and-card-light');report.checks.push('A later failing turn turns the earlier failures into compact markers (Usage limit reached, max-width 480px, gap 4/5px, no hint, own details) and the newest (CodexErrorInfo other) into the unknown card after its partial reply');
 // R08 output limit: the bridge's max-tokens stop is a completed turn carrying Turn.error MAX_TOKENS (no
 // ErrorNotification); c1298b0ba Z.output_token_limit card after the cut-off reply, View details dropped (G "drop").
 step('output-limit');await send('fixture:turn-error:output-limit');await page.getByText('OUTPUT_LIMIT_PARTIAL',{exact:false}).waitFor();
 await poll(async()=>await page.locator('[data-turn-error="card"][data-error-category="output_token_limit"]').count()===1,'output-limit card',12000);
 const limitCard=page.locator('[data-turn-error="card"]');
 assert.deepEqual(await errors().evaluateAll(nodes=>nodes.map(n=>[n.dataset.turnError,n.dataset.errorCategory])),[['marker','rate_limit'],['marker','rate_limit'],['marker','unknown'],['card','output_token_limit']]);
 const limitView=await limitCard.evaluate(node=>({headline:node.querySelector('.ste-headline').textContent,hint:node.querySelector('.ste-hint').textContent,icon:node.querySelector('.ste-header [data-cds=Icon]').textContent.codePointAt(0),
  iconColor:getComputedStyle(node.querySelector('.ste-header [data-cds=Icon]')).color,danger:(()=>{const p=document.createElement('span');p.style.color='var(--cds-text-danger)';node.append(p);const c=getComputedStyle(p).color;p.remove();return c;})()}));
 report.metrics.outputLimitCard=limitView;
 assert.deepEqual([limitView.headline,limitView.hint,limitView.icon,limitView.iconColor],['Response exceeded the output limit','Ask DeepSeek to continue, or break the task into smaller steps.',glyphs.Warning,limitView.danger]);
 assert.equal(await limitCard.getByRole('button',{name:'View details'}).count(),0,'output_token_limit drops View details');
 assert.equal(await limitCard.getByRole('button',{name:'Try again'}).count(),1,'retryHelps');assert.equal(await limitCard.getByRole('button',{name:'Compact session'}).count(),0);
 assert.equal((await orderAfter(limitCard,'OUTPUT_LIMIT_PARTIAL')).at,(await orderAfter(limitCard,'OUTPUT_LIMIT_PARTIAL')).anchor+1,'card follows the cut-off reply');
 assert.equal(await inlineAlerts().count(),0);
 await shot('output-limit-card-light');report.checks.push('R08: a completed turn with Turn.error MAX_TOKENS renders the output_token_limit card (Warning, "Response exceeded the output limit", DeepSeek continue hint, Try again, no View details) after the cut-off reply');
 // R08 recovery: contextWindowExceeded gets the secondary sm Compact session (cf6ae6197 CS ue) and no Try again; one click latches it.
 step('context');await send('fixture:turn-error:context');
 await poll(async()=>await page.locator('[data-turn-error="card"][data-error-category="context_length"]').count()===1,'context card',12000);
 assert.deepEqual(await errors().evaluateAll(nodes=>nodes.map(n=>[n.dataset.turnError,n.dataset.errorCategory])),[['marker','rate_limit'],['marker','rate_limit'],['marker','unknown'],['marker','output_token_limit'],['card','context_length']]);
 const limitMarker=page.locator('[data-turn-error="marker"][data-error-category="output_token_limit"]');
 assert.equal(await limitMarker.locator('.ste-marker-label').textContent(),'Response exceeded the output limit');assert.equal(await limitMarker.getByRole('button',{name:'View details'}).count(),0);
 await limitMarker.scrollIntoViewIfNeeded();await shot('output-limit-marker-light');
 const contextCard=page.locator('[data-turn-error="card"]');
 assert.equal(await contextCard.locator('.ste-headline').textContent(),'Your context window is full');// A core that serves thread/revert adds Rewind and the rewind hint (c70db48e3 X.contextLength); one without keeps the no-rewind hint.
 const contextRewind=await contextCard.getByRole('button',{name:'Rewind',exact:true}).count()>0;
 assert.equal(await contextCard.locator('.ste-hint').textContent(),contextRewind?'Compact it to summarize earlier messages and keep going, rewind to an earlier point, or start a new chat.':'This chat is too long to continue. Start a new chat.');
 assert.equal(await contextCard.getByRole('button',{name:'Try again'}).count(),0);
 const compactButton=contextCard.getByRole('button',{name:'Compact session',exact:true});await compactButton.waitFor();
 report.metrics.compactButton=await compactButton.evaluate(node=>({cds:node.dataset.cds,variant:node.dataset.variant??null,size:node.dataset.size??null,inActions:!!node.closest('.ste-actions'),cursor:getComputedStyle(node).cursor}));
 assert.equal(report.metrics.compactButton.inActions,true);assert.equal(report.metrics.compactButton.cursor,'default');
 await shot('context-card-light');await compactButton.click();
 assert.equal(await contextCard.getByRole('button',{name:'Compact session'}).count(),0,'latchOnAction hides the action after one click');
 // W14-code r3 css3-operation-status-band: 3.6556.2 Code draws no session-action strip (main.jsx renders
 // .session-operation-status only outside Code; compaction progress is the working line's 'Compacting session…',
 // c96d752d0 W6), so the compact is observed where it lands: thread/compact/start in the fixture core's history.
 await poll(async()=>String(await fs.readFile(path.join(profile,'fixture-history.jsonl'))).includes('"method":"thread/compact/start"'),'thread/compact/start reached the core');
 assert.equal(await page.locator('.session-operation-status').count(),0,'Code shows no session-action strip');
 assert.equal(await contextCard.getByRole('button',{name:'Compact session'}).count(),0,'stays latched');
 report.checks.push('R08: contextWindowExceeded shows "Your context window is full" with a secondary sm Compact session in the actions slot (no Try again); one click latches it and thread/compact/start reaches the core with no session-action strip in Code; the output-limit turn is now a marker without details');
 step('relaunch');const persistedTurns=(await read('fixture-threads.json')).threads[RC].turns,persisted=persistedTurns.filter(t=>t.status==='failed');assert.equal(persisted.length,4);
 assert.equal(persistedTurns.filter(t=>t.status==='completed'&&t.error?.additionalDetails==='MAX_TOKENS').length,1,'the output-limit turn completed with its error');
 await app.close();app=null;const prefs=await read('preferences.json');await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...prefs,theme:'dark'}));
 await launch();await page.locator('[data-turn-error="card"]').waitFor();
 assert.deepEqual(await errors().evaluateAll(nodes=>nodes.map(n=>[n.dataset.turnError,n.dataset.errorCategory])),[['marker','rate_limit'],['marker','rate_limit'],['marker','unknown'],['marker','output_token_limit'],['card','context_length']]);
 const history=(String(await fs.readFile(path.join(profile,'fixture-history.jsonl'))).trim().split('\n').map(JSON.parse)).filter(r=>r.params?.threadId===RC||r.params?.initialTurnsPage);report.metrics.historyMethods=[...new Set(history.map(r=>r.method))];
 await page.locator('[data-turn-error="card"]').getByRole('button',{name:'View details'}).click();await page.getByText('FIXTURE_CONTEXT_FULL',{exact:false}).waitFor();
 assert.equal(await page.locator('[data-turn-error="card"]').getByRole('button',{name:'Compact session'}).count(),1,'a relaunched card offers Compact session again');
 assert.equal(await inlineAlerts().count(),0);report.checks.push('Close and relaunch: history (Turn.status failed + Turn.error, and the completed output-limit turn) restores the markers and the newest card');
 step('dark-narrow');await poll(()=>page.evaluate(()=>document.documentElement.dataset.mode==='dark'),'dark mode');
 await shot('failed-dark');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await poll(()=>page.evaluate(()=>innerWidth===760),'760px');
 report.metrics.darkNarrowOverflow=await overflow();assert.equal(report.metrics.darkNarrowOverflow.doc,0);assert.equal(report.metrics.darkNarrowOverflow.body,0);assert.ok(report.metrics.darkNarrowOverflow.transcript.every(v=>v===0));
 const narrow=await page.locator('[data-turn-error="card"]').evaluate(n=>({width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width}));report.metrics.narrowCard=narrow;assert.ok(narrow.width<=narrow.parent+0.5);
 await page.locator('[data-turn-error="card"]').scrollIntoViewIfNeeded();await shot('failed-dark-760');
 report.checks.push('Dark theme and 760px: no document/body/transcript horizontal overflow and the card stays within its column');
 step('output-limit-dark');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await poll(()=>page.evaluate(()=>innerWidth===1324),'1324px');
 const darkMarker=page.locator('[data-turn-error="marker"][data-error-category="output_token_limit"]');await darkMarker.scrollIntoViewIfNeeded();
 assert.equal(await darkMarker.locator('.ste-marker-label').textContent(),'Response exceeded the output limit');await shot('output-limit-marker-dark');
 await send('fixture:turn-error:output-limit');
 await poll(async()=>await page.locator('[data-turn-error="card"][data-error-category="output_token_limit"]').count()===1,'dark output-limit card',12000);
 const darkLimit=await page.locator('[data-turn-error="card"]').evaluate(node=>{const probe=v=>{const p=document.createElement('span');p.style.color=v;node.append(p);const c=getComputedStyle(p).color;p.remove();return c;};
  return {headline:node.querySelector('.ste-headline').textContent,headlineColor:getComputedStyle(node.querySelector('.ste-headline')).color,primary:probe('var(--cds-text-primary)'),iconColor:getComputedStyle(node.querySelector('.ste-header [data-cds=Icon]')).color,danger:probe('var(--cds-text-danger)')};});
 report.metrics.outputLimitDark=darkLimit;assert.deepEqual([darkLimit.headline,darkLimit.iconColor],['Response exceeded the output limit',darkLimit.danger]);
 assert.notEqual(darkLimit.danger,report.metrics.outputLimitCard.danger,'dark danger token applies');
 await shot('output-limit-card-dark');report.checks.push('R08 dark: the output-limit marker restored from history and a new output-limit card use the dark tokens');
 // R08 thread error: ErrorNotification with turnId '' after the turn ended is a source card at the transcript tail, not a red alert.
 step('thread-error');await send('fixture:turn-error:thread');await page.getByText('THREAD_ERROR_REPLY',{exact:true}).waitFor();
 const threadCard=page.locator('[data-turn-error="card"][data-turn-id="thread"]');await threadCard.waitFor();
 assert.equal(await page.locator('[data-turn-error="card"]').count(),1,'the completed thread turn demotes the output-limit card');
 const tail=await errors().evaluateAll(nodes=>nodes.slice(-2).map(n=>[n.dataset.turnError,n.dataset.errorCategory,n.dataset.turnId]));
 assert.deepEqual(tail.map(([kind,category])=>[kind,category]),[['marker','output_token_limit'],['card','unknown']]);assert.equal(tail[1][2],'thread');assert.notEqual(tail[0][2],'thread');
 assert.equal(await threadCard.locator('.ste-headline').textContent(),'An API error occurred');assert.equal(await threadCard.locator('.ste-hint').textContent(),'Try sending your message again.');
 assert.equal(await threadCard.evaluate(node=>node.nextElementSibling?.dataset.testid),'code-transcript-status','thread card sits at the transcript tail');
 assert.equal(await threadCard.getByRole('button',{name:'Try again'}).count(),1,'retry offered: the last prompt is text-only');
 await threadCard.getByRole('button',{name:'View details'}).click();await threadCard.getByText('FIXTURE_THREAD_FAILURE',{exact:false}).waitFor();
 assert.equal(await inlineAlerts().count(),0);assert.equal(await page.locator('.source-transcript .inline-error, .transcript .inline-error').count(),0,'no raw transcript alert');
 await shot('thread-error-card-dark');report.checks.push('R08: an ErrorNotification without a turn id renders the source card (data-turn-id=thread) at the transcript tail with View details and Try again, never the raw .inline-error alert');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'turn-errors-ui-report.json'),bytes);console.log(bytes);}
