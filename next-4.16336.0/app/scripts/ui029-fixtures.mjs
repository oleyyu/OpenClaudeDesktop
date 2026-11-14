// Test-only data for the existing isolated codex-server fixture. No imports from
// production renderers/models: expected payloads remain independent of the UI.
export const IDS = Object.freeze({ empty:'ui029-empty', short:'ui029-short', multi:'ui029-multi', geometry:'ui029-geometry', longA:'ui029-long-A', longB:'ui029-long-B', userA:'ui029-user-A', userB:'ui029-user-B', bounded:'ui029-bounded' });
export const USER_JS = '\tconst userValue = "KEEP_USER";  \n\n';
export const USER_UNKNOWN = '<img src=x onerror="window.UI029_XSS=true">';
export const USER_TEXT = '**literal text**, not an assistant Markdown heading.\n\n```js\n'+USER_JS+'\n```\n\nAfter the code.\n\n```rust\n'+USER_UNKNOWN+'\n```';
export const ASSISTANT_JS = '\tconst assistantValue = "KEEP_ASSISTANT";  \n\n';
export const ASSISTANT_MARKDOWN = 'Assistant canonical Markdown.\n\n```js\n'+ASSISTANT_JS+'\n```';
export const ASSISTANT_SECOND = '\nSecond assistant text with **Markdown**.  ';
export const TURN_COPY = (ASSISTANT_MARKDOWN+'\n\n'+ASSISTANT_SECOND).trim();
export const USER_B_JS = 'const userValue = "SESSION_B_ONLY";';
// The 1,001-character source line exceeds the documented local 1,000-unit
// limit; the unknown language independently exercises the unsupported fallback.
export const OVERLONG = 'x'.repeat(1001);
export const UNCLOSED = 'Keep this literal:\n```js\nconst incomplete = true;';
export const TILDE = '~~~js\nconst unsupportedDelimiter = true;\n~~~';
const user=(id,text,attachments=[])=>({id,type:'userMessage',content:[{type:'text',text},...attachments]});
const agent=(id,text)=>({id,type:'agentMessage',text});
const tool=(id)=>({id,type:'commandExecution',command:'printf historical-only',status:'completed',exitCode:0,aggregatedOutput:'HISTORICAL_ONLY\n'.repeat(14)});
const done=(id,items)=>({id,status:'completed',items});
export function makeFixture({cwd,now=Math.floor(Date.now()/1000)}={}){
 if(typeof cwd!=='string'||!cwd.startsWith('/'))throw new Error('An explicit isolated absolute cwd is required');
 const thread=(id,name,turns,extra={})=>({id,name,cwd,createdAt:now,updatedAt:now,archived:false,turns,...extra});
 const history=label=>Array.from({length:28},(_,i)=>done(`history-${i}`,[user(`history-user-${i}`,`History prompt ${i}.`),agent(`history-answer-${i}`,`${label} reading row ${i}. A long paragraph wraps at narrower widths while preserving a real item anchor.\n\nThis second paragraph is deliberately part of the same item.`)]));
 return {next:100,threads:{
  [IDS.empty]:thread(IDS.empty,'UI029 empty',[]),
  [IDS.short]:thread(IDS.short,'UI029 short',[done('short-turn',[user('short-user','Short fixture request.'),agent('short-answer','Short completed answer.')])],{interruptDelayMs:350}),
  [IDS.geometry]:thread(IDS.geometry,'UI029 footer and Spark',[done('geometry-turn',[user('geometry-user','A short completed fixture.'),agent('geometry-answer','```js\nconst geometry = true;\n```')])]),
  [IDS.multi]:thread(IDS.multi,'UI029 completed turns',[done('multi-first',[user('multi-user','Historical fixture.'),agent('multi-a',ASSISTANT_MARKDOWN),tool('multi-tool'),agent('multi-b',ASSISTANT_SECOND),tool('multi-final-tool')]),done('multi-last',[agent('multi-last-answer','Final completed answer.')])]),
  [IDS.longA]:thread(IDS.longA,'UI029 long A',history('A'),{resumeDelayMs:350,interruptDelayMs:350}),
  [IDS.longB]:thread(IDS.longB,'UI029 long B',history('B')),
  [IDS.userA]:thread(IDS.userA,'UI029 user fences A',[done('shared-turn',[user('shared-user',USER_TEXT,[{type:'localImage',path:cwd+'/fixture-image.txt'}]),agent('shared-answer',ASSISTANT_MARKDOWN),tool('shared-tool'),agent('shared-second',ASSISTANT_SECOND)])]),
  [IDS.userB]:thread(IDS.userB,'UI029 user fences B',[done('shared-turn',[user('shared-user','```js\n'+USER_B_JS+'\n```'),agent('shared-answer','SESSION_B_RESPONSE')])]),
  [IDS.bounded]:thread(IDS.bounded,'UI029 bounded user fences',[done('bounded-turn',[user('bounded-user','```js\n'+OVERLONG+'\n```\n\n```rust\n'+USER_UNKNOWN+'\n```'),user('unclosed-user',UNCLOSED),user('tilde-user',TILDE),agent('bounded-answer','Fallback text remains complete.')])]),
 }};
}
export const STREAM_PROMPT='fixture:scroll';
export const APPROVAL_PROMPT='fixture:scroll-approval';
