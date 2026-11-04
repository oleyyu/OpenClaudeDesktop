import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Message-row timestamps end to end: OY (scroll-messages-current.js:33857) over
// wi.Timestamp AO/pO (scroll-shared-10-current.js:14983/14518). Z0 (43193) puts
// the time LAST in the assistant toolbar, BY (39683) puts it BEFORE Copy on the
// user row. Real main/preload/IPC with the isolated protocol fixture: Codex
// Turn.startedAt/completedAt from turn/started, turn/completed and history.
// Never clicks Copy (this suite runs without the memory clipboard).
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'turn-timestamps-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});
const now=Math.floor(Date.now()/1000),RC='turn-timestamps-session',DAY=86400;
const user=(id,text)=>({id,type:'userMessage',content:[{type:'text',text,text_elements:[]}]});
// Seeded history: one turn 3 days old with real times, one completed turn whose times are null.
const OLD={started:now-3*DAY-60,completed:now-3*DAY};
const seeded={id:RC,name:'Turn timestamps',cwd:workspace,historyMode:'paginated',createdAt:now-3*DAY,updatedAt:now,archived:false,turns:[
 {id:'seed-old',status:'completed',startedAt:OLD.started,completedAt:OLD.completed,items:[user('seed-old-user','Seeded old prompt.'),{id:'seed-old-answer',type:'agentMessage',text:'SEEDED_OLD_ANSWER'}]},
 {id:'seed-null',status:'completed',startedAt:null,completedAt:null,items:[user('seed-null-user','Seeded prompt without times.'),{id:'seed-null-answer',type:'agentMessage',text:'SEEDED_NULL_ANSWER'}]}]};
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:[RC],sidebarWidth:288,displayName:'Fixture'}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[RC]:seeded}}));
const read=async name=>JSON.parse(await fs.readFile(path.join(profile,name),'utf8'));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/main.jsx','src/state.js','src/relative-time-model.mjs','src/source-timestamp.jsx','src/source-timestamp.css','src/source-turn-footer.jsx','src/source-user-actions.jsx','src/source-session.jsx'])assert.ok(build.sources.some(entry=>entry.path===required),'build identifies '+required);
 const h=sha(await fs.readFile(path.join(root,'scripts/turn-timestamps-ui-test.mjs'))+await fs.readFile(path.join(root,'tests/fixtures/codex-server.cjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('TURN-TIMESTAMPS '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const composer=()=>page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324);
 await composer().waitFor();await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.getByText('SEEDED_OLD_ANSWER',{exact:true}).waitFor();await page.locator('.loading-state').waitFor({state:'detached'});}
async function send(text){await composer().fill(text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();}
const footer=turnId=>page.locator(`.stf-footer[data-turn-copy-id="${turnId}"]`);
const userRow=itemId=>page.locator(`.sua-row[data-user-actions-id="${itemId}"]`);
const park=()=>page.mouse.move(2,760);
// Reveal = hover the turn's row, then wait for the fade to finish (opacity 1).
async function reveal(hoverTarget,toolbar){await park();await hoverTarget.hover();await toolbar.waitFor();await poll(()=>toolbar.evaluate(n=>Math.abs(Number(getComputedStyle(n).opacity)-1)<.001),'toolbar revealed');}
const revealFooter=async(turnId,answer)=>{await reveal(page.locator(`[data-transcript-item-id="${answer}"]`),footer(turnId).locator('.stf-toolbar'));return footer(turnId);};
const revealUser=async itemId=>{await reveal(page.locator(`.source-user-message[data-transcript-item-id="${itemId}"] .source-user-bubble`),userRow(itemId).locator('.sua-toolbar'));return userRow(itemId);};
// Visible toolbar children in DOM order (the sr-only status span is not a control).
const order=toolbar=>toolbar.evaluate(node=>[...node.children].filter(c=>!c.classList.contains('sr-only')).map(c=>c.tagName==='TIME'?'time':c.getAttribute('aria-label')??c.querySelector('[aria-label]')?.getAttribute('aria-label')??null));
const timeView=row=>row.locator('time').evaluate(node=>{const s=getComputedStyle(node),probe=(prop,value)=>{const p=document.createElement('span');p.style.cssText=`position:absolute;visibility:hidden;${prop}:${value}`;node.parentElement.append(p);const v=getComputedStyle(p)[prop.replace(/-(.)/g,(_,c)=>c.toUpperCase())];p.remove();return v;};
 return {text:node.textContent,dateTime:node.getAttribute('datetime'),cds:node.dataset.cds,tabindex:node.getAttribute('tabindex'),title:node.getAttribute('title'),display:s.display,alignItems:s.alignItems,height:node.getBoundingClientRect().height,
  paddingStart:s.paddingInlineStart,paddingEnd:s.paddingInlineEnd,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color,numeric:s.fontVariantNumeric,userSelect:s.userSelect,
  tokens:{padMd:probe('padding-left','var(--cds-pad-md)'),control:probe('height','var(--cds-h-control)'),body:probe('font-size','var(--cds-font-size-body)'),leading:probe('line-height','var(--cds-leading-body)'),muted:probe('color','var(--cds-text-muted)')},
  rowHeight:node.closest('.stf-footer,.sua-row').getBoundingClientRect().height};});
const absolute=ms=>page.evaluate(ms=>new Date(ms).toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}),ms);
const tipSelector='.source-tooltip-popup:not([data-state="ending"])';
async function tooltipText(time){await park();await page.locator('.source-tooltip-popup').waitFor({state:'detached',timeout:3000}).catch(()=>{});await time.hover();await page.locator(tipSelector).waitFor();return page.locator(tipSelector).evaluate(n=>({text:n.textContent,side:n.closest('[data-side]')?.dataset.side??null}));}
function assertGeometry(view,{first}){
 assert.equal(view.cds,'RelativeTime');assert.equal(view.tabindex,null,'not focusable');assert.equal(view.title,null,'no native title');
 assert.deepEqual([view.display,view.alignItems],['flex','center']);assert.equal(`${view.height}px`,view.tokens.control,'h-control');
 assert.deepEqual([view.paddingStart,view.paddingEnd],first?['0px',view.tokens.padMd]:[view.tokens.padMd,'0px'],first?'first:ps-0 + pe-md':'ps-md + last:pe-0');
 assert.deepEqual([view.fontSize,view.lineHeight,view.fontWeight,view.color],[view.tokens.body,view.tokens.leading,'400',view.tokens.muted]);
 assert.equal(view.numeric,'tabular-nums');assert.equal(view.userSelect,'none');assert.equal(view.rowHeight,24,'toolbar row height unchanged');}
const overflow=()=>page.evaluate(()=>({doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth,transcript:[...document.querySelectorAll('.source-transcript-content')].map(n=>n.scrollWidth-n.clientWidth)}));
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
try{
 await integrity();await launch();
 step('history');
 const oldFooter=await revealFooter('seed-old','seed-old-answer');
 assert.deepEqual(await order(oldFooter.locator('.stf-toolbar')),['Copy','Fork from here','Pin as chapter','time'],'Z0: Copy, Fork from here (approval-current.js:43120-43128), Pin as chapter (B11, cd5a31703 H6e), then the timestamp last');
 const oldView=await timeView(oldFooter);report.metrics.historyFooter=oldView;assertGeometry(oldView,{first:false});
 assert.equal(oldView.dateTime,new Date(OLD.completed*1000).toISOString());assert.equal(oldView.text,'3 days ago');
 const oldTip=await tooltipText(oldFooter.locator('time'));report.metrics.historyTooltip=oldTip;assert.equal(oldTip.text,await absolute(OLD.completed*1000));assert.equal(oldTip.side,'top');
 assert.match(oldTip.text,/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s[AP]M$/,'fO: no time zone name');
 await park();await page.locator('.source-tooltip-popup').waitFor({state:'detached',timeout:3000});// hoverable false: leaving the <time> closes it
 const oldUser=await revealUser('seed-old-user');
 assert.deepEqual(await order(oldUser.locator('.sua-toolbar')),['time','Copy','Rewind to here','Fork from here'],'BY: timestamp before Copy, then the idle session’s Rewind / Fork');
 const oldUserView=await timeView(oldUser);report.metrics.historyUser=oldUserView;assertGeometry(oldUserView,{first:true});
 assert.equal(oldUserView.dateTime,new Date(OLD.started*1000).toISOString());assert.equal(oldUserView.text,'3 days ago');
 await shot('history-user-row-light');
 const nullFooter=await revealFooter('seed-null','seed-null-answer');assert.equal(await nullFooter.locator('time').count(),0,'completedAt null: no time');assert.deepEqual(await order(nullFooter.locator('.stf-toolbar')),['Copy','Fork from here','Pin as chapter']);
 report.metrics.nullFooterHeight=await nullFooter.evaluate(n=>n.getBoundingClientRect().height);assert.equal(report.metrics.nullFooterHeight,24);
 const nullUser=await revealUser('seed-null-user');assert.equal(await nullUser.locator('time').count(),0,'startedAt null: no time');
 await revealFooter('seed-old','seed-old-answer');await shot('history-light');
 report.checks.push('History (thread/resume initialTurnsPage): finished turn footer is Copy then <time data-cds=RelativeTime> "3 days ago" with dateTime=completedAt ISO and the fO absolute tooltip on top; user row puts the startedAt time before Copy; h-control/ps-md/first:ps-0/last:pe-0/body/text-muted/tabular-nums/select-none; row stays 24px; null times render no <time>');
 step('running');await send('fixture:timestamps');await page.getByText('TIMESTAMP_RUNNING',{exact:true}).waitFor();
 const live=(await read('fixture-threads.json')).threads[RC].turns.at(-1);report.metrics.liveTurn={id:live.id,startedAt:live.startedAt,completedAt:live.completedAt};
 assert.equal(live.completedAt??null,null);assert.equal(typeof live.startedAt,'number');
 const liveUserId=live.items[0].id;const liveUser=await revealUser(liveUserId);
 const liveUserView=await timeView(liveUser);assert.equal(liveUserView.dateTime,new Date(live.startedAt*1000).toISOString());assert.equal(liveUserView.text,'2 minutes ago');assert.deepEqual(await order(liveUser.locator('.sua-toolbar')),['time','Copy','Rewind to here'],'while the agent works Rewind is offered disabled (its reason in a tooltip) and Fork is not');
 await page.locator(`[data-transcript-item-id="progress-${live.id}"]`).hover();await page.waitForTimeout(300);
 assert.equal(await footer(live.id).count(),0,'running turn: no footer');assert.equal(await page.locator(`.stf-footer[data-turn-copy-id="${live.id}"] time`).count(),0,'running turn: no <time>');
 await shot('running-light');report.checks.push('While the turn runs (Turn.startedAt 125s ago, completedAt null) the user row shows "2 minutes ago" before Copy and the turn has no footer and no <time>');
 step('completed');await fs.writeFile(path.join(profile,'fixture-background-timestamps-complete'),'1');await page.getByText('TIMESTAMP_FIXTURE_REPLY',{exact:true}).waitFor();
 await poll(async()=>typeof (await read('fixture-threads.json')).threads[RC].turns.at(-1).completedAt==='number','completedAt persisted');
 const done=(await read('fixture-threads.json')).threads[RC].turns.at(-1);report.metrics.completedTurn={id:done.id,startedAt:done.startedAt,completedAt:done.completedAt};
 const answer=done.items.at(-1).id;const doneFooter=await revealFooter(done.id,answer);
 assert.deepEqual(await order(doneFooter.locator('.stf-toolbar')),['Copy','Fork from here','Pin as chapter','time']);
 const doneView=await timeView(doneFooter);report.metrics.completedFooter=doneView;assertGeometry(doneView,{first:false});
 assert.equal(doneView.dateTime,new Date(done.completedAt*1000).toISOString(),'dateTime = Turn.completedAt');assert.equal(doneView.text,'2 minutes ago');
 const doneTip=await tooltipText(doneFooter.locator('time'));report.metrics.completedTooltip=doneTip;assert.equal(doneTip.text,await absolute(done.completedAt*1000));
 await doneFooter.getByRole('button',{name:'Copy',exact:true}).focus();{const rovers=await doneFooter.evaluate(n=>[...n.querySelectorAll('.stf-toolbar button:not(:disabled)')].map(b=>b.getAttribute('aria-label')));let at=0;for(const key of ['ArrowLeft','ArrowRight','Home','End']){await page.keyboard.press(key);at=key==='Home'?0:key==='End'?rovers.length-1:(at+(key==='ArrowRight'?1:-1)+rovers.length)%rovers.length;assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),rovers[at],`${key} roves over the toolbar; the <time> is never a stop`);}await page.keyboard.press('Home');}
 await page.evaluate(()=>document.activeElement?.blur());await revealFooter(done.id,answer);await doneFooter.locator('time').hover();await page.locator(tipSelector).waitFor();await poll(()=>page.locator(tipSelector).evaluate(n=>Number(getComputedStyle(n).opacity)>.999),'tooltip entered');await shot('completed-tooltip-light');
 report.checks.push('turn/completed: footer shows Copy then "2 minutes ago" (dateTime = Turn.completedAt ISO), absolute tooltip equals toLocaleString(en-US fO options); arrow/Home/End keep focus on Copy (time is not a roving item)');
 step('relaunch-dark');await app.close();app=null;const prefs=await read('preferences.json');await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...prefs,theme:'dark'}));
 await launch();await poll(()=>page.evaluate(()=>document.documentElement.dataset.mode==='dark'),'dark mode');await page.getByText('TIMESTAMP_FIXTURE_REPLY',{exact:true}).waitFor();
 const restored=await revealFooter(done.id,answer);const restoredView=await timeView(restored);report.metrics.restoredFooter=restoredView;
 assert.equal(restoredView.dateTime,new Date(done.completedAt*1000).toISOString());assert.match(restoredView.text,/^(2|3) minutes ago$/);assertGeometry(restoredView,{first:false});
 const restoredUser=await revealUser(liveUserId);assert.equal((await timeView(restoredUser)).dateTime,new Date(done.startedAt*1000).toISOString());
 await revealFooter(done.id,answer);await shot('completed-dark');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await poll(()=>page.evaluate(()=>innerWidth===760),'760px');
 await revealFooter(done.id,answer);report.metrics.darkNarrowOverflow=await overflow();assert.equal(report.metrics.darkNarrowOverflow.doc,0);assert.equal(report.metrics.darkNarrowOverflow.body,0);assert.ok(report.metrics.darkNarrowOverflow.transcript.every(v=>v===0));
 const narrow=await restored.evaluate(n=>{const t=n.querySelector('time').getBoundingClientRect(),c=n.closest('.source-transcript-content').getBoundingClientRect();return {timeRight:t.right,columnRight:c.right,height:n.getBoundingClientRect().height};});report.metrics.narrow=narrow;assert.ok(narrow.timeRight<=narrow.columnRight+0.5);assert.equal(narrow.height,24);
 await shot('completed-dark-760');
 report.checks.push('Relaunch (thread/turns/list history) restores the footer and user-row times; dark theme and 760px: no document/body/transcript horizontal overflow, row still 24px');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'turn-timestamps-ui-report.json'),bytes);console.log(bytes);}
