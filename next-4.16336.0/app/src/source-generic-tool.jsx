import React from 'react';
import {CommandCopyButton} from './source-command.jsx';
import {SourceAnsiText} from './source-ansi-text.jsx';
import {genericToolBody,genericToolDetails,questionAnswers,todoChecklist} from './generic-tool-model.mjs';
import {SourcePlanChecklist} from './source-plan-checklist.jsx';
import {chipPathOpenable} from './user-inline-model.mjs';
import './source-generic-tool.css';
import {t} from '../electron/i18n/index.mjs';
const codeKeys=new Set(['command','cmd','script','shell','code','pattern','regex','glob']);
function InputValue({entry,cwd,onOpenFileRef}) {
 const {key,value,text}=entry;
 if(['file_path','notebook_path'].includes(key)&&typeof value==='string') {
  const content=<code className="sgt-path-code">{value}</code>;
  return onOpenFileRef&&chipPathOpenable(value,cwd)?<button type="button" className="sgt-path" onClick={()=>onOpenFileRef({path:value})}>{content}</button>:content;
 }
 return <span className={typeof value!=='string'||codeKeys.has(key)?'sgt-code-value':undefined}>{text}</span>;
}
export function SourceGenericToolBody({item,state,cwd,onOpenFileRef,inCard=false}) {
 const body=genericToolBody(item,state);
 if(body==='none')return null;
 // todo_write: the plan pane's checklist instead of the todos JSON.
 if(body==='todos')return <div className="sgt-body sgt-todos"><SourcePlanChecklist plan={todoChecklist(item)} className="source-plan-list-inline"/></div>;
 // ask_user_question: Qoe (approval-current.js:7349-7395) `flex flex-col gap-md pt-xs`,
 // each pair `flex flex-col text-body`: question text-secondary, answer text-muted.
 if(body==='questions')return <div className="sgt-body sgt-qa">{questionAnswers(item,state).map((entry,index)=><div className="sgt-qa-entry" key={`${index}-${entry.question}`}>
  <div className="sgt-qa-question">{entry.question}</div>
  {entry.answer!=null&&<div className="sgt-qa-answer">{entry.answer}</div>}
 </div>)}</div>;
 const detail=genericToolDetails(item);
 if(!detail.hasDetails&&!item.codeDesktop?.mcpApp)return null;
 // KO :6943-6944 i = onlyBody && !inCard && mcp__: a group row's MCP body is not standalone.
 const failed=state==='failed',standalone=item.type==='mcpToolCall'&&!inCard;
 const result=<>{detail.error&&<div className="sgt-error"><SourceAnsiText text={detail.error}/></div>}{detail.text&&<div className={failed?'sgt-error':undefined}><SourceAnsiText text={detail.text}/></div>}</>;
 const args=detail.entries.length?<div className="sgt-inputs">{detail.entries.map(entry=><div className="sgt-input" key={entry.key}><span className="sgt-input-key">{entry.key}:</span>{' '}<InputValue entry={entry} cwd={cwd} onOpenFileRef={onOpenFileRef}/></div>)}</div>:null;
 return <div className="sgt-body" data-standalone={standalone||undefined}><div className="sgt-body-inner">
  <div className="sgt-details" role="group" aria-label={t("Tool call details")} tabIndex={0}>
   {failed?result:args}{failed?args:result}
   {item.codeDesktop?.mcpApp&&<div className="sgt-note" data-mcp-app="">{t("This connector also has an interactive view, which OpenClaude Desktop can’t show yet.")}</div>}
  </div><CommandCopyButton text={detail.copyText}/>
 </div></div>;
}
