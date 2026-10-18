// Extract layout from the freshly unpacked installed app, without evaluating its services.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
const root=path.resolve(import.meta.dirname,'..');
const reference='reference/installed-2.31226.0-20261012/ion-dist/assets/v1';
const source=path.resolve(root,'..',reference), output=path.join(root,'src/generated/current-chat');
const modules=new Map();
const adapters={
 'c2bb74286-D8NXeKVk.js':{R:['../../source-artifact-adapters.jsx','useArtifactIntl'],I:['../../source-artifact-adapters.jsx','messageDescriptors'],j:['../../source-chat-adapters.jsx','HostTooltip']},
 'c028ce168-BgWF3hW2.js':{l:['../../source-chat-adapters.jsx','HostButton'],c:['../../source-chat-adapters.jsx','SourceIcon']},

 'shared-28-MgJrblDu.js':{Yc:['../../source-artifact-adapters.jsx','messageDescriptors']},
 'c042dc97b-DCdI16Un.js':{e:['../../source-artifact-adapters.jsx','ARTIFACT_WEEKDAY_FORMAT']},
 'c193cfc9b-2wgBbI8O.js':{l:['../../source-chat-adapters.jsx','usePageLayer']},
 'cf8745532-BMxkFAAg.js':{r:['../../source-chat-adapters.jsx','LocalLink'],a:['../../source-chat-adapters.jsx','ThemePortal']},
 'cbef3b9e7-CuJuDnSt.js':{r:['../../source-chat-adapters.jsx','HostPictogram'],i:['../../source-chat-adapters.jsx','DensityRoot'],a:['../../source-chat-adapters.jsx','HostButton']},
 'cf35aed38-kaP0vyce.js':{_:['../../source-chat-adapters.jsx','DisabledReasonTooltip'],b:['../../source-chat-adapters.jsx','SourceIcon'],x:['../../source-chat-adapters.jsx','HostButton'],T:['../../source-chat-adapters.jsx','HostMenuButton'],h:['../../source-chat-adapters.jsx','HostTooltip'],f:['../../source-chat-adapters.jsx','ThemePortal'],w:['../../source-chat-adapters.jsx','useLocalizedCopy'],m:['../../source-chat-adapters.jsx','useDesktopPlatform']},
 'c71dee58b-X8_F3dre.js':Object.fromEntries(Object.entries({Bn:'useProjectAnalytics',Z:'useProjectIntl',qt:'useDesktopFrame',Lt:'useDesktopFrame',gt:'useNoProjectSharing',ht:'useNoProjectSharing',da:'useNoProjectSharing',$n:'useNoProjectSharing',Uo:'NoProjectSharing',Ho:'NoProjectSharing',Ll:'NoProjectSharing',Rl:'projectSubtitle',oi:'useProjectMutation',li:'useProjectOptimisticUpdate',Ti:'useLocalSpaceSelector',sn:'LocalProjectMarker',ut:'LocalProjectMenu',it:'LocalProjectMenu',ga:'ProjectArchivedBadge',_n:'ThemePortal',ci:'ProjectTypes',X:'LocalizedMessage',Y:'HostButton'}).map(([k,v])=>[k,['../../source-project-adapters.jsx',v]])),
 'c75e89812-Cz6W_Gc9.js':{r:['../../source-chat-adapters.jsx','HostButton']},
 'cd75b47e6-DZ61gJR_.js':{t:['../../source-artifact-adapters.jsx','useArtifactBand'],n:['../../source-chat-adapters.jsx','useDesktopFrame']},
 'c230724a2-BxatGObJ.js':Object.fromEntries(Object.entries({Q:'useArtifactIntl',Z:'ArtifactMessage',Dr:'useArtifactOwners',Or:'isSharedArtifact',It:'useArtifactTypeChips',Cr:'useArtifactAnnouncement',H:'useArtifactToday',St:'ArtifactDate',kt:'artifactTypeInfo',Tr:'formatArtifactCount',Qr:'ArtifactThumbnail',Hn:'NoCloudArtifact',gt:'NoCloudArtifact'}).map(([k,v])=>[k,['../../source-artifact-adapters.jsx',v]])),

 'c21f11e6d-CxD82rYo.js':{Z:['../../source-chat-adapters.jsx','LocalizedMessage']},
 'cc5a62f6f-BgHG1Ree.js':{l:['../../source-chat-adapters.jsx','useDesktopFrame'],u:['../../source-chat-adapters.jsx','DensityRoot'],d:['../../source-chat-adapters.jsx','SourceIcon']},
 'c4038fd41-DE0MYtnD.js':{R:['../../source-chat-adapters.jsx','useDisabledTodoComment'],z:['../../source-chat-adapters.jsx','DisabledTodoComment'],d:['../../source-chat-adapters.jsx','useScopedState'],x:['../../source-chat-adapters.jsx','LocalizedMessage'],y:['../../source-chat-adapters.jsx','SourceIcon']},
 'shared-18-DaJGQi6_.js':{Z:['../../source-chat-adapters.jsx','LocalizedMessage'],Ru:['../../source-chat-adapters.jsx','useDesktopFrame']},
 'shared-5-DXmEIvP_.js':{ho:['../../source-chat-adapters.jsx','Attachments'],_t:['../chat/shared-8-B5xbG2px.js','vl'],So:['../../source-chat-adapters.jsx','useAttachmentAnchor'],rs:['../../source-chat-adapters.jsx','Presence'],ko:['../../source-chat-adapters.jsx','AttachmentAnchorContext']},
 'shared-frame-DVFSKIcx.js':{d:['../../source-field-adapters.jsx','NativeFieldControl'],sl:['../../source-chat-adapters.jsx','HostButton'],X:['../chat/shared-frame-C_2npUJq.js','X']},
 'vendor-frame-foKw4lFA.js':{re:['react','version'],o:['react','default'],fe:['react/jsx-runtime','default'],ge:['../../source-chat-adapters.jsx','classNames']},
 'shared-23-CuGEZNcW.js':{X:['../../source-home-adapters.jsx','useHomeIntl'],Ev:['../../source-chat-adapters.jsx','GreetingLocaleTransitionContext'],Ey:['./shared-frame-DVFSKIcx.js','Am']},
};
// Current Cowork home: keep source rendering/order; bind account/session services
// to local records. No cloud feature client is imported or evaluated.
Object.assign(adapters['shared-23-CuGEZNcW.js'], Object.fromEntries(Object.entries({
 Jf:'useHomePins', Eg:'useHomePins', Pb:'useHomeSessions', lb:'useHomeReadState', BF:'useHomeReady',
 Lp:'useHomeScheduleAccess', wh:'useHomeSchedules', NE:'useHomePins', hw:'useHomeAttentionIds',
 Xb:'pendingHomeCreation', Fb:'clearHomeActive', Ux:'useHomeMotion', Sd:'HomeLink',
 vo:'useHomeToday', Yp:'homeDateKey', nb:'homeTaskName',
}).map(([key,value])=>[key,['../../source-home-adapters.jsx',value]])));
Object.assign(adapters['shared-23-CuGEZNcW.js'], Object.fromEntries(Object.entries({
 Bb:'useIdeaSurface', Cp:'ideaTrue', bI:'useCurrentLocalIdeas', LT:'ideaFalse', K:'useIdeaScope',
 Ko:'ideaFalse', lg:'ideaFalse', hf:'ideaTrue', Af:'ideaFalse', og:'ideaFalse', tI:'ideaFalse',
 z:'ideaFalse', Uw:'ideaFalse', nI:'ideaFalse', yI:'useNoSkillIdeas', eI:'useIdeaAnalytics',
 hI:'useCurrentIdeaSelection', _I:'loadCurrentIdeaCatalog', PC:'useIdeaPrompt', CC:'useIdeaEditor',
 bx:'useIdeaCommands', Ix:'useIdeaTarget', Tx:'useIdeaTracker', Ty:'IdeaLabel', rn:'ideaMetricName',
 qe:'ideaMetricHash', Rx:'ideaCommandNodes', AS:'ideaCommandName',
}).map(([key,value])=>[key,['../../source-ideas-adapters.jsx',value]])));
Object.assign(adapters['shared-23-CuGEZNcW.js'], {Ly:['../../source-chat-adapters.jsx','SourceIcon'],Y:['../../source-chat-adapters.jsx','LocalizedMessage'],yy:['../../source-chat-adapters.jsx','classNames']});
adapters['shared-19-DmuztgN-.js'] = Object.fromEntries(Object.entries({
 qr:'useHomePermissions', wu:'useHomeAnalytics', Ds:'useHomePins', di:'useHomeNow', jp:'homeSessionOpened',
 Fo:'HomeLink', J_:'useHomeNeedsAttention', fu:'useHomePins', Gr:'HomeSessionStatus',
 ke:'homeSessionHasInlineReview', $s:'useHomeReviewDelay',
}).map(([key,value])=>[key,['../../source-home-adapters.jsx',value]]));
Object.assign(adapters['shared-19-DmuztgN-.js'], {$f:['../../source-chat-adapters.jsx','SourceIcon'],X:['../../source-chat-adapters.jsx','LocalizedMessage'],ep:['../../source-chat-adapters.jsx','HostButton'],Ef:['../../source-home-adapters.jsx','UnavailableInlineReview'],AI:['../../source-home-adapters.jsx','UnavailableInlineReview'],J:['../../source-home-adapters.jsx','UnavailableInlineReview'],Jh:['../chat/vendor-intl-Cf4IuK3L.js','$t']});
adapters['shared-2-DtKYxnkM.js'] = {CM:['../../source-ideas-adapters.jsx','ideaFalse']};
adapters['vendor-intl-C-oMXuBz.js'] = {tn:['../../source-artifact-adapters.jsx','messageDescriptors']};
Object.assign(adapters['shared-18-DaJGQi6_.js'], {
 rd:['../../source-home-adapters.jsx','HomeIcon'], _D:['../../source-home-adapters.jsx','HomeStatusDot'],
 wD:['../../source-home-adapters.jsx','homeTone'], iE:['../../source-chat-adapters.jsx','useDesktopFrame'],
 Zu:['../../source-chat-adapters.jsx','HostTooltip'],
});
// Installed scheduled-task cards and templates use the local scheduler services.
adapters['cdbc75b4b-B7cRd8zz.js'] = {
 P:['../../source-routine-adapters.jsx','useRoutineIntl'], M:['../../source-artifact-adapters.jsx','messageDescriptors'],
 S:['../../source-home-adapters.jsx','useHomeNow'], le:['../../source-routine-adapters.jsx','noRemoteModel'],
 xi:['../../source-routine-form-adapters.jsx','noLocalConstraint'], Ci:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'], bi:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'], Mi:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'], K:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
 Ai:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'], wi:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
 fn:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'], be:['../../source-routine-adapters.jsx','routineAccent'],
 D:['../../source-chat-adapters.jsx','SourceIcon'], oe:['../../source-routine-adapters.jsx','CurrentRoutineMenu'],
 k:['../../source-routine-adapters.jsx','RoutineSourceMenu'], O:['../../source-chat-adapters.jsx','HostButton'],
 N:['../../source-chat-adapters.jsx','LocalizedMessage'],
};
Object.assign(adapters['shared-frame-DVFSKIcx.js'], {g:['../../source-field-adapters.jsx','useNativeFieldMetadata'],ip:['../../source-chat-adapters.jsx','HostTooltip'],lC:['../../source-chat-adapters.jsx','HostCollapsible'],Lo:['../../source-chat-adapters.jsx','SourceIcon']});
Object.assign(adapters['shared-18-DaJGQi6_.js'], Object.fromEntries(Object.entries({
 Q:'useRoutineIntl', Ec:'useRoutineAnalytics', ti:'useRoutineErrors', ts:'useRoutineBridge',
 Wd:'noRemoteModel', Oo:'noRemoteModel', zd:'noRemoteModel', Xh:'noRemoteModel', Do:'unavailableMigration', UV:'UnavailableRoutineBadge',
 fd:'RoutineSourceMenu', tg:'RoutineSourceMenu', Lt:'routineErrorMessage',
}).map(([key,value])=>[key,['../../source-routine-adapters.jsx',value]])));
Object.assign(adapters['shared-18-DaJGQi6_.js'], {id:['../../source-chat-adapters.jsx','HostButton'],rg:['../../source-routine-detail-adapters.jsx','RoutineFragment']});
adapters['ccd3f68fe-CZhDe3qc.js'] = { Z:['../../source-routine-adapters.jsx','useRoutineIntl'], jr:['../../source-artifact-adapters.jsx','messageDescriptors'] };

Object.assign(adapters['ccd3f68fe-CZhDe3qc.js'], Object.fromEntries(Object.entries({
 Wn:'RoutineInfo', wt:'noRoutineTools', Fr:'noRoutineTools', qr:'UnavailableRoutineBadge', di:'noRoutineTools', pi:'UnavailableRoutineBadge',
 $a:'noRoutineBlockers', so:'UnavailableRoutineBadge', Ee:'scheduledKind', yt:'useRoutineNow', ve:'noRemoteModel', Kt:'noRemoteModel', Jr:'useCurrentScheduledCopy',
 Xe:'noRemoteModel', Tt:'noRoutineTools', or:'noRemoteModel', wr:'noRemoteModel', fr:'noRoutineDevice', pr:'noRemoteModel', At:'noRoutineDevice',
 fo:'noRoutineEffect', gi:'noDeviceConnectivity', ko:'noRoutineDevice', hn:'noRoutineEffect', mr:'noRemoteModel', en:'noRemoteModel', dr:'noRemoteModel',
 Er:'useRoutineReadState', Sa:'noRoutineReview', an:'routinePermissionSupported', Hr:'routinePermissionDescription', tn:'noRoutineTools',
 er:'RoutineSwitch', wa:'noRoutineConnectionHold', Ea:'UnavailableRoutineBadge', Ta:'UnavailableRoutineBadge', Ca:'UnavailableRoutineBadge',
 Vn:'RoutineFragment', dn:'RoutineFragment', Vi:'UnavailableRoutineBadge', 
 $n:'RoutineDialog', tr:'RoutineConfirmation', Yn:'RoutineCheckbox', st:'RoutineSessionStatus',
}).map(([key,value])=>[key,['../../source-routine-detail-adapters.jsx',value]])));
Object.assign(adapters['ccd3f68fe-CZhDe3qc.js'], Object.fromEntries(Object.entries({
 X:'LocalizedMessage', q:'HostButton', K:'SourceIcon', Kn:'HostTooltip', Jn:'DisabledReasonTooltip', Zn:'LocalLink', Pt:'LocalLink',
}).map(([key,value])=>[key,['../../source-chat-adapters.jsx',value]])));
Object.assign(adapters['ccd3f68fe-CZhDe3qc.js'], { D:['../../source-routine-form-adapters.jsx','useFormModels'], Wr:['../../source-routine-form-adapters.jsx','formModelName'], b:['../../source-routine-form-adapters.jsx','formModelName'] });
Object.assign(adapters['shared-16-OoLrhcjl.js'] ??= {}, {dr:['../../source-artifact-adapters.jsx','messageDescriptors']});
adapters['c1dd841c3-Cvf1IRsf.js'] = {n:['../../source-artifact-adapters.jsx','messageDescriptors'],r:['../../source-chat-adapters.jsx','LocalizedMessage']};
adapters['c32f7beb9-Bs2-KYZS.js'] = {r:['../../source-routine-detail-adapters.jsx','useRoutineSkills'],i:['../../source-routine-detail-adapters.jsx','UnavailableRoutineBadge']};

// Current scheduled form: local scheduler/model/folder services; no account cloud jobs.
adapters['c97b955f1-BIk31E_b.js'] = Object.fromEntries(Object.entries({
 Tn:'useRoutineIntl', Kn:'useCurrentFormCopy', Fe:'useFormMessages', ut:'useFormBridge',
 rt:'falseFeature', ie:'formFeature', fn:'falseFeature', ln:'noFormData', Wn:'noFormData',
 _e:'useFormPreferences', ht:'useFormAnalytics', ge:'useOtherRoutineNames', Pr:'useNoRoutineReview', Ee:'useFormNow',
 Qt:'falseFeature', dn:'falseFeature', bn:'falseFeature', Me:'useFormRouter', de:'falseFeature', pe:'useCurrentFormCopy',
 ue:'falseFeature', be:'falseFeature', we:'falseFeature', h:'useStableFormEvent', ve:'noFormData', Xe:'falseFeature',
 nt:'useNoRoutineTools', cn:'falseFeature', Ie:'falseFeature', kn:'falseFeature', re:'formBridgeAvailable', _t:'useNoAccount',
 lt:'falseFeature', Ze:'useFormPermissions', ae:'useFormModels', Te:'useModelUnavailable', Ve:'useNoProjectAccess',
 He:'falseFeature', Re:'falseFeature', hn:'noLocalConstraint', Vn:'falseFeature', vn:'localSource', We:'falseFeature',
 le:'noFormData', yi:'falseFeature', nr:'useFormDebounce', Pi:'noFormEffect', Fi:'noFormEffect', Ni:'noFormData',
 xr:'useManualDraft', Ne:'useNoAccount', vi:'useNoRoutineNotifications',
 Ln:'formPermissionItems', Qe:'formPermissionValue', Ue:'falseFeature', In:'formPermissionDescription', Bn:'usePermissionSelection', Ge:'formPermissionStore',
 er:'alreadyAcknowledged', $n:'noFormEffect', Pn:'falseFeature', Nn:'formModelName', 
 it:'noFormEffect', y:'hasRoutineName', Wr:'falseFeature', Hr:'noFormData', Qr:'noFormData',
 vt:'invokeFormOperation', bt:'falseFeature', yt:'falseFeature', ce:'formErrorMessage',
 xe:'falseFeature', ye:'falseFeature', Se:'noFormData', ne:'noFormEffect', st:'falseFeature',
 Rn:'formModelName', Vt:'FormConfirmation', Lt:'FormDialog', Fn:'FormFolderPicker',
 ir:'formModelName', Cn:'noFormData', ui:'UnavailableFormBranch', ci:'UnavailableFormBranch', ai:'UnavailableFormBranch',
 Er:'UnavailableFormBranch', tr:'UnavailableFormBranch', hi:'UnavailableFormBranch', gi:'UnavailableFormBranch', Lr:'UnavailableFormBranch', Vr:'UnavailableFormBranch', zr:'UnavailableFormBranch', Ur:'UnavailableFormBranch', Br:'UnavailableFormBranch',
 Ba:'UnavailableFormBranch', Ar:'UnavailableFormBranch', Fr:'UnusedCodeContext', se:'UnavailableFormBranch',
}).map(([key,value])=>[key,['../../source-routine-form-adapters.jsx',value]]));
Object.assign(adapters['c97b955f1-BIk31E_b.js'], {
 wn:['../../source-artifact-adapters.jsx','messageDescriptors'], j:['../../source-routine-form-adapters.jsx','FormMessage'],
 At:['../../source-routine-form-adapters.jsx','FormSelect'],zn:['../../source-routine-form-adapters.jsx','formModelName'],_:['../../source-routine-form-adapters.jsx','formModelName'], It:['../../source-chat-adapters.jsx','HostButton'], Ft:['../../source-chat-adapters.jsx','SourceIcon'], Mt:['../../source-routine-form-adapters.jsx','FormLink'],
 Ct:['../../source-routine-detail-adapters.jsx','RoutineInfo'], Bt:['../../source-routine-detail-adapters.jsx','RoutineSwitch'],
 St:['./shared-frame-DVFSKIcx.js','wC'],kt:['../../source-chat-adapters.jsx','DisabledReasonTooltip'],
});
adapters['cfccd3f04-BiyDqLUX.js']={a:['../../source-routine-adapters.jsx','useRoutineIntl']};
adapters['c0efc2620-BdXsfbkU.js'] = {me:['../../source-routine-form-adapters.jsx','formCatalogConfig'],N:['../../source-routine-form-adapters.jsx','identity'],te:['../../source-routine-form-adapters.jsx','formModelName'],p:['../../source-routine-form-adapters.jsx','formModelName'],T:['../../source-routine-form-adapters.jsx','FormSelect'],ee:['../../source-routine-form-adapters.jsx','FormCatalogPicker'],j:['../../source-routine-adapters.jsx','useRoutineIntl'],D:['../../source-chat-adapters.jsx','SourceIcon'],S:['../../source-chat-adapters.jsx','HostCollapsible'],O:['../../source-routine-detail-adapters.jsx','RoutineSwitch']};
adapters['cff2bf6cb-BcVMRZW0.js']={j:['../../source-calendar-adapters.jsx','CalendarButton'],g:['../../source-calendar-adapters.jsx','CalendarPopover'],n:['../../source-calendar-adapters.jsx','useCalendarFieldDescription'],x:['../../source-calendar-adapters.jsx','calendarLocale']};
adapters['caa9df187-DFQv8cbo.js']={m:['../../source-artifact-adapters.jsx','messageDescriptors']};
Object.assign(adapters['shared-frame-DVFSKIcx.js'], {zx:['../../source-routine-adapters.jsx','RoutineSourceMenu'],Be:['../../source-field-adapters.jsx','NativeFieldRoot'],a:['../../source-field-adapters.jsx','NativeFieldLabel'],R:['../../source-field-adapters.jsx','NativeFieldDescription'],Ue:['../../source-field-adapters.jsx','NativeFieldError']});
adapters['cfa4655f9-BAdHT16K.js']={_:['../../source-routine-adapters.jsx','useRoutineIntl'],f:['../../source-chat-adapters.jsx','SourceIcon']};
const allowed=new Set(['shared-2-DtKYxnkM.js','shared-100-Bs3K3KCN.js','vendor-intl-C-oMXuBz.js','shared-25-B37c0AC9.js','shared-4-KMRq4mDb.js','c21f11e6d-CxD82rYo.js','cc5a62f6f-BgHG1Ree.js','c4038fd41-DE0MYtnD.js','shared-5-DXmEIvP_.js','shared-19-DmuztgN-.js','shared-23-CuGEZNcW.js','shared-frame-DVFSKIcx.js','shared-26-CT0kz82X.js','shared-1-BPVqFfwb.js','shared-18-DaJGQi6_.js']);
async function get(name){if(modules.has(name))return modules.get(name);const code=await fs.readFile(path.join(source,name),'utf8');const ast=parsers.babel.parse(code);let program;babel.traverse(ast,{Program(p){program=p}});const exports=new Map();for(const n of ast.program.body)if(n.type==='ExportNamedDeclaration')for(const s of n.specifiers)exports.set(s.exported.name,s.local.name);const m={name,code,program,exports,selected:new Map(),imports:new Map(),seen:new Set(),literals:new Map(),initializers:new Map()};modules.set(name,m);return m;}
async function add(m,name){if(m.seen.has(name))return;m.seen.add(name);const adapter=adapters[m.name]?.[name];if(adapter){m.imports.set(name,adapter);return;}const p=m.program.scope.getBinding(name)?.path;if(!p)throw Error(`Unbound ${m.name}:${name}`);
 if(m.name==='vendor-frame-foKw4lFA.js'&&!['Kt','Jt','Yt','$t','en','Gt','Xt','Zt','Qt','nn','Wt','an','tn','on','rn'].includes(name)){
  const init=p.node.init;if(init?.type==='MemberExpression'&&['o','fe','Sr'].includes(init.object.name)){m.imports.set(name,[init.object.name==='fe'?'react/jsx-runtime':init.object.name==='Sr'?'react-dom':'react',init.property.name]);return;}
  throw Error(`Vendor boundary ${name}: ${m.code.slice(p.node.start,p.node.end).slice(0,100)}`);
 }
 if(p.isImportSpecifier()){const file=p.parent.source.value.slice(2);if(!allowed.has(file)&&file!=='vendor-frame-foKw4lFA.js')throw Error(`Boundary ${m.name}:${name} from ${file}:${p.node.imported.name}`);const dep=await get(file),local=dep.exports.get(p.node.imported.name);m.imports.set(name,['./'+file,local]);await add(dep,local);return;}
 m.selected.set(name,p);const deps=new Set();p.traverse({ReferencedIdentifier(r){if(r.scope.getBinding(r.node.name)?.scope===m.program.scope)deps.add(r.node.name)}});for(const d of deps)try{await add(m,d)}catch(e){throw Error(`${m.name}:${name} -> ${e.message}`)};
}
function literal(m,owner,name,prefix){const matches=[];m.program.scope.getBinding(owner).path.traverse({StringLiteral(p){if(p.node.value.startsWith(prefix))matches.push(p.node)}});if(matches.length!==1)throw Error(`${owner}:${name} literal count ${matches.length}`);m.literals.set(name,matches[0]);}
for(const file of ['caa9df187-DFQv8cbo.js','cff2bf6cb-BcVMRZW0.js','c6a2ab736-DT3u3_eh.js','shared-125-CbVXqztB.js','cfa4655f9-BAdHT16K.js','cfccd3f04-BiyDqLUX.js','c46686c0b-DmFpsCbb.js','c0efc2620-BdXsfbkU.js','c97b955f1-BIk31E_b.js','shared-150-CLvmPbZG.js','ca0c38004-CEGIs7-p.js','c32f7beb9-Bs2-KYZS.js','vendor-icons-DDsFzYXd.js','c3d5d2a6f-Cb6r-Pna.js','c9e1458cd-C-OdbuDq.js','c2d1766e9-BvFJMdLU.js','c07677de0-_OwZl_d6.js','c95f03c33-DhBxw_e-.js','c1c6ea9ac-9gbw1jMB.js','c1dd841c3-Cvf1IRsf.js','c0efc2620-BdXsfbkU.js','ccd3f68fe-CZhDe3qc.js','cdbc75b4b-B7cRd8zz.js','c511d59b8-uRWjm_YF.js','c0958e5bf-DgQg_ba5.js','cc09daa9b-_uZIwQg7.js','shared-75-BauJ3twV.js','shared-0-tP5vNlHv.js','shared-50-Bmc9oUMm.js','rolldown-runtime-C3OYiQ02.js','c2bb74286-D8NXeKVk.js','c028ce168-BgWF3hW2.js','shared-9-CAAkBVM3.js','c193cfc9b-2wgBbI8O.js','cf8745532-BMxkFAAg.js','cbef3b9e7-CuJuDnSt.js','cf35aed38-kaP0vyce.js','c71dee58b-X8_F3dre.js','c75e89812-Cz6W_Gc9.js','c230724a2-BxatGObJ.js','cd75b47e6-DZ61gJR_.js','c042dc97b-DCdI16Un.js','shared-16-OoLrhcjl.js','shared-10-DDvJOzr_.js','shared-28-MgJrblDu.js','shared-3-DVMvy2kM.js'])allowed.add(file);
Object.assign(adapters['c230724a2-BxatGObJ.js'],{ge:['../../source-chat-adapters.jsx','LocalLink'],_t:['../../source-chat-adapters.jsx','SourceIcon'],ut:['../../source-chat-adapters.jsx','HostTooltip'],ot:['../../source-chat-adapters.jsx','ThemePortal'],pt:['../../source-chat-adapters.jsx','HostTooltip'],ci:['../../source-artifact-adapters.jsx','renderArtifactMenu']});
for(const [file,names] of Object.entries({'c2bb74286-D8NXeKVk.js':['ui','mi'],'shared-9-CAAkBVM3.js':['bf','xf'],'c193cfc9b-2wgBbI8O.js':['_'],'cf8745532-BMxkFAAg.js':['l'],'cbef3b9e7-CuJuDnSt.js':['s'],'c71dee58b-X8_F3dre.js':['pu'],'c75e89812-Cz6W_Gc9.js':['i','a'],'c230724a2-BxatGObJ.js':['Vi','Jr']}))for(const name of names)await add(await get(file),name);
// R4g-routines RTC (CW-1): the Cowork Scheduled page's roots (shared-18 GV, cdbc75b4b Fi / yi / Ii, shared-150 dL,
// ca0c38004 n, c97b955f1 ga with its calendar initializers, shared-16 Id, ccd3f68fe gc / fc / dc / _o and the three grid
// literals) moved to 2.42304.0: scripts/extract-cowork-scheduled.mjs over scripts/extract-routines-shared.mjs.
for (const name of ['GF','xI']) await add(await get('shared-23-CuGEZNcW.js'), name);
for (const name of ['gD','uD','Ry']) await add(await get('shared-18-DaJGQi6_.js'), name);
await add(await get('c2bf50d9e-Borm-ayr.js'), 'o');
const shell=await get('shared-5-DXmEIvP_.js');for(const name of ['Rf','Wd','ef','tf','yd','ai','Br'])await add(shell,name);
const layout=await get('shared-19-DmuztgN-.js');for(const name of ['GA','nj','rj','uj','cj','fj','Dj'])await add(layout,name);
const greeting=await get('shared-23-CuGEZNcW.js');await add(greeting,'CN'); await add(await get('shared-frame-DVFSKIcx.js'),'Am');
literal(greeting,'XI','homeColumnClass','relative flex flex-col items-center gap-6');
literal(greeting,'XI','homeScrollClass','min-h-0 flex-1 overflow-x-hidden overflow-y-auto');
const homeColumn=await get('shared-18-DaJGQi6_.js');await add(homeColumn,homeColumn.exports.get('su'));
const activity=await get('c21f11e6d-CxD82rYo.js'); for(const name of ['Px','Fx'])await add(activity,name);
const panel=await get('cc5a62f6f-BgHG1Ree.js');for(const name of ['j','N','m','v','_','y'])await add(panel,name);
await fs.mkdir(output,{recursive:true});const manifest=[];
for(const m of modules.values()){const imports=[...m.imports].map(([local,[from,name]])=>`import { ${name} as ${local} } from ${JSON.stringify(from)};`).join('\n');const declarations=[...m.selected.values(),...m.initializers.values()].sort((a,b)=>a.node.start-b.node.start).map(p=>(p.isVariableDeclarator()?'var ':'')+m.code.slice(p.node.start,p.node.end)+(p.isVariableDeclarator()?';':'')).join('\n').replaceAll('"/images/illustrations/', '"./images/illustrations/').replaceAll('"/assets/v1/', '"./assets/v1/');const literals=[...m.literals].map(([name,n])=>`var ${name}=${m.code.slice(n.start,n.end)};`).join('\n');const body=`// Extracted from installed Claude Desktop 2.31226.0. Do not edit.\n${imports}\n${declarations}\n${literals}\nexport { ${[...m.selected.keys(),...m.imports.keys(),...m.literals.keys()].join(', ')} };\n`;await fs.writeFile(path.join(output,m.name),body);manifest.push({source:m.name,sha256:createHash('sha256').update(m.code).digest('hex'),outputSha256:createHash('sha256').update(body).digest('hex'),declarations:[...m.selected.keys()],initializers:[...m.initializers.values()].map(p=>({start:p.node.start,end:p.node.end})),boundaries:[...m.imports]});}
// A module no root reaches any more is removed with the roots that reached it (RTC).
for(const file of await fs.readdir(output))if(file.endsWith('.js')&&!modules.has(file))await fs.rm(path.join(output,file));
await fs.writeFile(path.join(output,'provenance.json'),JSON.stringify({reference,version:'2.31226.0',modules:manifest},null,2)+'\n');console.log(`Current Chat: ${manifest.length} modules`);
