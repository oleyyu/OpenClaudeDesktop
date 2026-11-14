import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSION_MODES, threadPermissionParams, turnPermissionParams, validateBypassRequest, bypassAvailability, approvesPlan, afterPlanPermission, approvedPlanPermission, nativeCollaborationMode, planImplementationTurn, PLAN_IMPLEMENTATION_MESSAGE, planResponseRequestsBypass } from '../electron/permission-policy.mjs';
import { planReviewResponse } from '../src/approval-draft-model.mjs';
import { settingsPatch } from '../electron/preferences.mjs';

test('Bypass uses the actual thread and turn schema while retaining the ordinary permission modes', () => {
  assert.deepEqual(threadPermissionParams({permission:'bypass'}), {approvalsReviewer:'user',approvalPolicy:'never',sandbox:'danger-full-access'});
  assert.deepEqual(turnPermissionParams({permission:'bypass',cwd:'/fixture'}), {approvalsReviewer:'user',approvalPolicy:'never',sandboxPolicy:{type:'dangerFullAccess'},collaborationMode:{mode:'default'}});
  assert.equal(threadPermissionParams({permission:'auto'}).approvalPolicy,'on-request');
  assert.equal(threadPermissionParams({permission:'ask'}).approvalPolicy,'untrusted');
  assert.deepEqual(turnPermissionParams({permission:'auto',cwd:'/fixture',additionalFolders:['/extra']}).sandboxPolicy,{type:'workspaceWrite',writableRoots:['/fixture','/extra'],networkAccess:false,excludeTmpdirEnvVar:false,excludeSlashTmp:false});
  for (const options of [{permission:'plan',hints:true},{permission:'bypass',mode:'chat'},{permission:'bypass',review:true},{permission:'plan',mode:'chat'},{permission:'plan',review:true}]) {
    // A read-only native thread never asks to escalate; the hinted Plan keeps on-request (the bridge enforces it).
    assert.equal(threadPermissionParams(options).approvalPolicy,options.hints||options.review?'on-request':'never');assert.equal(threadPermissionParams(options).sandbox,'read-only');
    assert.deepEqual(turnPermissionParams(options).sandboxPolicy,{type:'readOnly',networkAccess:false});
  }
  assert.throws(()=>threadPermissionParams({permission:'typo'}));assert.throws(()=>threadPermissionParams({mode:'typo'}));
});
test('Bypass requirements distinguish unavailable data, organization restrictions and explicitly unlimited requirements', () => {
  for (const response of [undefined,{}, {requirements:false},{requirements:[]}]) assert.equal(bypassAvailability(response).allowed,false);
  for (const requirements of [null,{}, {allowedSandboxModes:null,allowedApprovalPolicies:null},{allowedSandboxModes:['danger-full-access'],allowedApprovalPolicies:['never']}]) assert.equal(bypassAvailability({requirements}).allowed,true);
  for (const requirements of [{allowedSandboxModes:['workspace-write']},{allowedApprovalPolicies:['on-request']},{allowedApprovalPolicies:[]},{allowedSandboxModes:'danger-full-access'}]) assert.match(bypassAvailability({requirements}).reason,/organization/);
});
test('Bypass requires local opt-in, checks requirements again for each request and propagates backend failures', async () => {
  const params=threadPermissionParams({permission:'bypass'});let calls=0;
  const read=async()=>{calls++;return {requirements:null};};
  await assert.rejects(validateBypassRequest(params,{},read),/Settings/);assert.equal(calls,0);
  await validateBypassRequest(params,{allowBypassPermissions:true},read);await validateBypassRequest(params,{allowBypassPermissions:true},read);assert.equal(calls,2);
  await validateBypassRequest(threadPermissionParams({permission:'auto'}),{},()=>{throw Error('must not read');});
  await assert.rejects(validateBypassRequest(params,{allowBypassPermissions:true},async()=>({requirements:{allowedApprovalPolicies:['untrusted']}})),/organization/);
  await assert.rejects(validateBypassRequest(params,{allowBypassPermissions:true},async()=>{throw Error('requirements offline');}),/requirements offline/);
  let config={allowBypassPermissions:true};await assert.rejects(validateBypassRequest(params,()=>config,async()=>{config={allowBypassPermissions:false};return {requirements:null};}),/Settings/);
});
test('Local bypass opt-in is a validated boolean and never changes the persisted default mode', () => {
  const initial={permission:'plan',allowBypassPermissions:false};const enabled=settingsPatch(initial,{allowBypassPermissions:true});
  assert.deepEqual(enabled,{permission:'plan',allowBypassPermissions:true});assert.equal(initial.allowBypassPermissions,false);
  assert.equal(settingsPatch(enabled,{allowBypassPermissions:false}).permission,'plan');
  for(const value of ['true',1,null,undefined]) assert.throws(()=>settingsPatch(initial,{allowBypassPermissions:value}),/bypass/);
  assert.throws(()=>settingsPatch(initial,{permission:'bypass'}),/permission/);
});
test('DeepSeek mode hint: Plan is told apart from chat and review; Codex params carry no hint', () => {
  assert.deepEqual(threadPermissionParams({permission:'plan',hints:true}), {approvalsReviewer:'user',approvalPolicy:'on-request',sandbox:'read-only',codeDesktop:{permissionMode:'plan',afterPlan:'auto'}});
  assert.deepEqual(turnPermissionParams({permission:'plan',hints:true,afterPlan:'ask',cwd:'/fixture'}),
    {approvalsReviewer:'user',approvalPolicy:'on-request',codeDesktop:{permissionMode:'plan',afterPlan:'ask'},sandboxPolicy:{type:'readOnly',networkAccess:false}});
  assert.equal(threadPermissionParams({permission:'plan',mode:'chat',hints:true}).codeDesktop.permissionMode,'chat');
  assert.equal(threadPermissionParams({permission:'plan',review:true,hints:true}).codeDesktop.permissionMode,'review');
  assert.equal(threadPermissionParams({permission:'auto',mode:'chat',review:true,hints:true}).codeDesktop.permissionMode,'review');
  for (const permission of ['auto','ask','bypass']) assert.equal(threadPermissionParams({permission,hints:true}).codeDesktop.permissionMode,permission);
  assert.equal(threadPermissionParams({permission:'auto',hints:true,afterPlan:'plan'}).codeDesktop.afterPlan,'auto');
  assert.equal(threadPermissionParams({permission:'plan',hints:true,afterPlan:'bypass'}).codeDesktop.afterPlan,'bypass');
  // Without hints (Codex, fixtures) nothing changes.
  for (const options of [{permission:'plan'},{permission:'plan',afterPlan:'ask'},{permission:'auto',hints:'yes'}]) {
    assert.equal(Object.hasOwn(threadPermissionParams(options),'codeDesktop'),false);
    assert.equal(Object.hasOwn(turnPermissionParams({...options,cwd:'/fixture'}),'codeDesktop'),false);
  }
});
test('An approved plan review is the plan-review question answered exactly Approve; Bypass never follows a plan', () => {
  const request={method:'item/tool/requestUserInput',params:{questions:[{id:'plan-review',question:'Approve this plan and leave plan mode?',options:[{label:'Approve'},{label:'Keep planning'}],isOther:true}]}};
  assert.equal(approvesPlan(request,{answers:{'plan-review':{answers:['Approve']}}}),true);
  for (const answers of [{'plan-review':{answers:['Keep planning']}},{'plan-review':{answers:['Make it smaller']}},{'plan-review':{answers:['Approve','x']}},{}])
    assert.equal(approvesPlan(request,{answers}),false);
  assert.equal(approvesPlan({...request,method:'item/fileChange/requestApproval'},{answers:{'plan-review':{answers:['Approve']}}}),false);
  assert.equal(approvesPlan({method:'item/tool/requestUserInput',params:{questions:[{id:'q',question:'Ok?',options:[{label:'Approve'}]}]}},{answers:{q:{answers:['Approve']}}}),false);
  assert.equal(afterPlanPermission('ask'),'ask');
  assert.equal(afterPlanPermission('acceptEdits'),'acceptEdits');
  for (const value of ['auto','bypass',undefined]) assert.equal(afterPlanPermission(value),'auto');
  // A remembered Bypass continues as Bypass only while it is available (opt-in on, core allows it).
  assert.equal(afterPlanPermission('bypass',{bypass:true}),'bypass');
  assert.equal(afterPlanPermission('auto',{bypass:true}),'auto');
});
test('R07 plan card: Accept continues in Manual, the primary in its target; reject/revise keep Plan; Bypass only when chosen', () => {
  const request={method:'item/tool/requestUserInput',params:{questions:[{id:'plan-review',question:'Approve this plan and leave plan mode?',options:[{label:'Approve'},{label:'Keep planning'}],isOther:true}]}};
  const mode=(action,target,remembered='auto')=>approvedPlanPermission(request,planReviewResponse(action,{target,feedback:'x'}),remembered);
  // Rse ee (approval-current.js:9520-9578): accept → 'default' (Manual); the primary → trustForwardMode.
  assert.equal(mode('accept','acceptEdits'),'ask');
  assert.equal(mode('primary','acceptEdits'),'acceptEdits');
  assert.equal(mode('primary','auto','ask'),'auto');
  assert.equal(mode('primary','ask','acceptEdits'),'ask');
  // 'Accept and bypass permissions' (Mk bypassPermissions) names Bypass explicitly; main validates it.
  assert.equal(mode('primary','bypass'),'bypass');
  assert.equal(mode('reject','acceptEdits'),null);
  assert.equal(mode('revise','acceptEdits'),null);
  // Without the extension (an older payload) the remembered mode decides, never Bypass.
  assert.equal(approvedPlanPermission(request,{answers:{'plan-review':{answers:['Approve']}}},'acceptEdits'),'acceptEdits');
  assert.equal(approvedPlanPermission(request,{answers:{'plan-review':{answers:['Approve']}}},'bypass'),'auto');
  assert.equal(approvedPlanPermission(request,{answers:{'plan-review':{answers:['Approve']}},codeDesktop:{afterPlan:'bypass'}},'ask'),'bypass');
  assert.equal(planResponseRequestsBypass(planReviewResponse('primary',{target:'bypass'})),true);
  assert.equal(planResponseRequestsBypass(planReviewResponse('primary',{target:'auto'})),false);
  assert.equal(approvedPlanPermission({...request,method:'item/fileChange/requestApproval'},planReviewResponse('primary'),'auto'),null);
});
test('Accept edits (shared-14 nE/aE) maps to untrusted + workspace-write with the acceptEdits hint, on-request without hints; invalid modes still throw', () => {
  assert.deepEqual(PERMISSION_MODES,['auto','ask','acceptEdits','plan','bypass']);
  assert.deepEqual(threadPermissionParams({permission:'acceptEdits',hints:true}),{approvalsReviewer:'user',approvalPolicy:'untrusted',sandbox:'workspace-write',codeDesktop:{permissionMode:'acceptEdits',afterPlan:'auto'}});
  assert.deepEqual(turnPermissionParams({permission:'acceptEdits',hints:true,cwd:'/fixture'}),
    {approvalsReviewer:'user',approvalPolicy:'untrusted',codeDesktop:{permissionMode:'acceptEdits',afterPlan:'auto'},sandboxPolicy:{type:'workspaceWrite',writableRoots:['/fixture'],networkAccess:false,excludeTmpdirEnvVar:false,excludeSlashTmp:false}});
  // Codex gets no hint: Accept edits is its own on-request + workspace-write, which applies patches inside the
  // writable roots without asking (safety.rs assess_patch_safety; untrusted would ask for every patch).
  assert.deepEqual(threadPermissionParams({permission:'acceptEdits'}),{approvalsReviewer:'user',approvalPolicy:'on-request',sandbox:'workspace-write'});
  assert.notDeepEqual(threadPermissionParams({permission:'acceptEdits'}),threadPermissionParams({permission:'ask'}));
  // Chat and review stay read-only and say so in the hint; Plan can continue as Accept edits.
  assert.equal(threadPermissionParams({permission:'acceptEdits',mode:'chat',hints:true}).codeDesktop.permissionMode,'chat');
  assert.equal(threadPermissionParams({permission:'plan',hints:true,afterPlan:'acceptEdits'}).codeDesktop.afterPlan,'acceptEdits');
  for (const permission of ['acceptedits','dontAsk','default']) assert.throws(()=>threadPermissionParams({permission}),/valid permission/);
  // Settings may persist it as the default; Bypass still cannot be.
  assert.equal(settingsPatch({permission:'auto'},{permission:'acceptEdits'}).permission,'acceptEdits');
  assert.throws(()=>settingsPatch({},{permission:'acceptedits'}),/permission/);
});

test('Plan without permission hints is the core\u2019s native plan mode, read-only with nothing to escalate; other modes reset it', () => {
  // Codex 0.155.1 ModeKind "plan" | "default" on turn/start; never + read-only rejects every patch and escalation.
  assert.deepEqual(threadPermissionParams({permission:'plan'}),{approvalsReviewer:'user',approvalPolicy:'never',sandbox:'read-only'});
  assert.deepEqual(turnPermissionParams({permission:'plan',cwd:'/w'}),{approvalsReviewer:'user',approvalPolicy:'never',sandboxPolicy:{type:'readOnly',networkAccess:false},collaborationMode:{mode:'plan'}});
  for (const permission of ['auto','ask','acceptEdits','bypass']) assert.deepEqual(turnPermissionParams({permission,cwd:'/w'}).collaborationMode,{mode:'default'},permission);
  // Chat stays chat: read-only in the default mode, and never asks to escalate (an approved escalation would write).
  assert.deepEqual(turnPermissionParams({permission:'plan',mode:'chat',cwd:'/w'}).collaborationMode,{mode:'default'});
  for (const permission of PERMISSION_MODES) {
    assert.equal(turnPermissionParams({permission,mode:'chat',cwd:'/w'}).approvalPolicy,'never',permission);
    // A review keeps its Mode's policy (Manual asks before each command), still read-only.
    assert.equal(threadPermissionParams({permission,review:true}).approvalPolicy,permission==='ask'?'untrusted':'on-request',permission);
    // A hinted core enforces chat itself (the mode hint), so it keeps on-request there.
    assert.equal(threadPermissionParams({permission:permission==='bypass'?'auto':permission,mode:'chat',hints:true}).approvalPolicy,['ask','acceptEdits'].includes(permission)?'untrusted':'on-request',permission);
  }
  // A hinted core gets the hint and never collaborationMode.
  for (const permission of PERMISSION_MODES) assert.equal('collaborationMode' in turnPermissionParams({permission,hints:true,cwd:'/w'}),false,permission);
  // main.cjs completes the settings from the turn (else the saved default); no model, no mode.
  assert.deepEqual(nativeCollaborationMode({collaborationMode:{mode:'plan'},model:'gpt-5.5',effort:'high'}),{mode:'plan',settings:{model:'gpt-5.5',reasoning_effort:'high',developer_instructions:null}});
  assert.deepEqual(nativeCollaborationMode({collaborationMode:{mode:'default'},model:null,effort:null},{model:'relay-a',effort:'low'}),{mode:'default',settings:{model:'relay-a',reasoning_effort:'low',developer_instructions:null}});
  assert.equal(nativeCollaborationMode({collaborationMode:{mode:'plan'}}),null);
  // Plan reasons at the core's own Plan effort (plan_mode_reasoning_effort, else the Plan preset's), never the everyday one.
  assert.equal(nativeCollaborationMode({collaborationMode:{mode:'plan'},model:'gpt-5.5',effort:'low'},{planEffort:'xhigh'}).settings.reasoning_effort,'xhigh');
  assert.equal(nativeCollaborationMode({collaborationMode:{mode:'plan'},model:'gpt-5.5',effort:'ultra'},{planEffort:null}).settings.reasoning_effort,null);
  assert.equal(nativeCollaborationMode({collaborationMode:{mode:'default'},model:'gpt-5.5',effort:'low'},{planEffort:'xhigh'}).settings.reasoning_effort,'low');
  assert.equal(nativeCollaborationMode({collaborationMode:{mode:'pair'},model:'m'}),null);
  assert.equal(nativeCollaborationMode({model:'m'}),null);
  // The handoff after a native plan: Codex's own "Implement the plan." with the permission the plan continues with.
  assert.equal(PLAN_IMPLEMENTATION_MESSAGE,'Implement the plan.');
  assert.deepEqual(planImplementationTurn('acceptEdits'),{text:'Implement the plan.',permission:'acceptEdits'});
  assert.deepEqual(planImplementationTurn('bypass'),{text:'Implement the plan.',permission:'auto'});
  assert.deepEqual(planImplementationTurn('bypass',{bypass:true}),{text:'Implement the plan.',permission:'bypass'});
});
test('Sandbox network access opens only the workspace-write sandbox, on every core', () => {
  for (const hints of [false, true]) for (const permission of ['auto', 'ask', 'acceptEdits']) {
    const policy = turnPermissionParams({permission, hints, cwd:'/w', networkAccess:true}).sandboxPolicy;
    assert.deepEqual(policy, {type:'workspaceWrite',writableRoots:['/w'],networkAccess:true,excludeTmpdirEnvVar:false,excludeSlashTmp:false});
    assert.equal(turnPermissionParams({permission, hints, cwd:'/w', networkAccess:'yes'}).sandboxPolicy.networkAccess, false);
    assert.equal(turnPermissionParams({permission, hints, cwd:'/w'}).sandboxPolicy.networkAccess, false);
  }
  // Plan, chat and review stay offline; Bypass is already full access. The thread params carry no such field.
  for (const options of [{permission:'plan'},{permission:'auto',mode:'chat'},{permission:'auto',review:true}])
    assert.deepEqual(turnPermissionParams({...options, cwd:'/w', networkAccess:true}).sandboxPolicy, {type:'readOnly',networkAccess:false});
  assert.deepEqual(turnPermissionParams({permission:'bypass', cwd:'/w', networkAccess:true}).sandboxPolicy, {type:'dangerFullAccess'});
  assert.equal('networkAccess' in threadPermissionParams({permission:'auto', networkAccess:true}), false);
});
test('Codex auto-review: Auto asks Codex’s reviewer (auto_review) where the core has it; Accept edits, Manual, Plan, Bypass and hinted cores keep the user', () => {
  assert.equal(threadPermissionParams({permission:'auto', autoReview:true}).approvalsReviewer, 'auto_review');
  assert.equal(turnPermissionParams({permission:'auto', autoReview:true, cwd:'/w'}).approvalsReviewer, 'auto_review');
  assert.equal(threadPermissionParams({permission:'auto'}).approvalsReviewer, 'user', 'without the feature');
  for (const permission of ['acceptEdits', 'ask', 'plan', 'bypass'])
    assert.equal(threadPermissionParams({permission, autoReview:true}).approvalsReviewer, 'user', permission);
  assert.equal(threadPermissionParams({permission:'auto', mode:'chat', autoReview:true}).approvalsReviewer, 'user');
  assert.equal(threadPermissionParams({permission:'auto', hints:true, autoReview:true}).approvalsReviewer, 'user', 'a hinted core has its own Auto');
  // Auto and Accept edits now differ on Codex.
  assert.notDeepEqual(turnPermissionParams({permission:'auto', autoReview:true, cwd:'/w'}), turnPermissionParams({permission:'acceptEdits', autoReview:true, cwd:'/w'}));
});
