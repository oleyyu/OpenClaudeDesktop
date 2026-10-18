// Copy the reachable original CDS layout declarations, without evaluating the app bundle.
// Service boundaries are explicit in source-chat-adapters; no account/network modules are shipped.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(root, '../reference/current-2.2553.1/ion-dist/assets/v1');
const output = path.join(root, 'src/generated/chat');
const modules = new Map();
const vendor = {
  Da: ['react', 'default'], Ha: ['react', 'useReducer'],
  aa: ['./vendor-frame-BmPfNbgY.js', 'Wt'], oa: ['./vendor-frame-BmPfNbgY.js', 'Lt'],
  ia: ['./vendor-frame-BmPfNbgY.js', 'qt'],
  ya: ['react', 'cloneElement'], xa: ['react', 'createElement'],
  va: ['react', 'Suspense'],
  Ra: ['react', 'useImperativeHandle'], Ga: ['react', 'useSyncExternalStore'], Ia: ['react', 'useEffectEvent'], za: ['react', 'useInsertionEffect'], La: ['react', 'useId'], Ba: ['react', 'useLayoutEffect'], Ca: ['react', 'forwardRef'], Ea: ['react', 'memo'], Fa: ['react', 'useEffect'], Ma: ['react', 'useContext'],
  Ua: ['react', 'useRef'], Va: ['react', 'useMemo'], Wa: ['react', 'useState'], ba: ['react', 'createContext'],
  ca: ['react', 'Fragment'], ha: ['react', 'Fragment'], ja: ['react', 'useCallback'], pa: ['react', 'Children'],
  wa: ['react', 'isValidElement'], la: ['react/jsx-runtime', 'jsx'], ua: ['react/jsx-runtime', 'jsxs'],
  ni: ['react-dom', 'flushSync'], ti: ['react-dom', 'createPortal'],
  qa: ['react', 'version'], sa: ['../../source-chat-adapters.jsx', 'classNames'],
};
const adapters = {
  'c32f7beb9-C22xyv_3.js': { r:['../../source-routine-detail-adapters.jsx','useRoutineSkills'], i:['../../source-routine-detail-adapters.jsx','UnavailableRoutineBadge'] },
  'c1dd841c3-BG9tG1BD.js': { n:['../../source-artifact-adapters.jsx','messageDescriptors'], r:['../../source-routine-detail-adapters.jsx','RoutineMessage'] },
  'shared-7-DsClUbcz.js': { Fa:'HostCollapsible' },
  'vendor-intl-Cf4IuK3L.js': { Qt:['../../source-home-adapters.jsx','HomeRelativeTime'] },
  'shared-21-D098Wd--.js': { vm:'useDesktopFrame', nc:['../../source-home-adapters.jsx','HomeIcon'], fO:['../../source-home-adapters.jsx','HomeStatusDot'], _O:['../../source-home-adapters.jsx','homeTone'], Xs:'HostTooltip' },
  // Greeting's only host services are the active locale and locale-transition context.
  // cp is the source Spark's idle branch (bd); greetings never pass an animation state.
  'shared-24-C4QZCHDk.js': { $:['../../source-home-adapters.jsx','useHomeIntl'], Ji:'GreetingLocaleTransitionContext', cp:['./shared-frame-C_2npUJq.js','bd'],
    Gc:['../../source-home-adapters.jsx','useHomePins'], Hc:['../../source-home-adapters.jsx','useHomePins'], dv:['../../source-home-adapters.jsx','useHomeSessions'], Sy:['../../source-home-adapters.jsx','useHomeReadState'], bD:['../../source-home-adapters.jsx','useHomeReady'], tl:['../../source-home-adapters.jsx','useHomeScheduleAccess'], Qv:['../../source-home-adapters.jsx','useHomeSchedules'], Xo:['../../source-home-adapters.jsx','useHomeAttentionIds'], Wo:['../../source-home-adapters.jsx','pendingHomeCreation'], Ey:['../../source-home-adapters.jsx','clearHomeActive'], km:['../../source-home-adapters.jsx','useHomeMotion'], vp:'classNames', Q:'LocalizedMessage', go:['../../source-home-adapters.jsx','HomeLink'], A_:['../../source-home-adapters.jsx','useHomeToday'], fa:['../../source-home-adapters.jsx','homeDateKey'], Lc:['../../source-home-adapters.jsx','HomeClock'], El:['../../source-home-adapters.jsx','HomePause'], Xc:['../../source-home-adapters.jsx','HomeArrow'], Bo:['../../source-home-adapters.jsx','homeTaskName'] },
  'shared-22-Cz3C_T8d.js': { Kn:['../../source-home-adapters.jsx','useHomePermissions'], Ga:['../../source-home-adapters.jsx','useHomeAnalytics'], uc:['../../source-home-adapters.jsx','useHomePins'], kh:['../../source-home-adapters.jsx','useHomeNow'], Uv:['../../source-home-adapters.jsx','homeSessionOpened'], lo:['../../source-home-adapters.jsx','HomeLink'], Jn:['../../source-home-adapters.jsx','HomeSessionStatus'], Ho:['../../source-home-adapters.jsx','useHomeNeedsAttention'], Kd:['./vendor-intl-Cf4IuK3L.js','$t'], ms:['../../source-home-adapters.jsx','HomePin'], is:['../../source-home-adapters.jsx','HomeStar'], ec:['../../source-home-adapters.jsx','HomeClock'], as:['../../source-home-adapters.jsx','useHomePins'], hc:['../../source-home-adapters.jsx','HomeArrow'], Y:'LocalizedMessage', G:'HostButton', Ql:['../../source-home-adapters.jsx','UnavailableInlineReview'], _O:['../../source-home-adapters.jsx','UnavailableInlineReview'], K:['../../source-home-adapters.jsx','UnavailableInlineReview'] },
  'ca324bb72-DogKBzRY.js': { W: ['../../source-artifact-adapters.jsx','useArtifactIntl'], H: ['../../source-artifact-adapters.jsx','messageDescriptors'], g:'HostButton', P:'HostTooltip', ie:'SourceIcon' },
  'c042dc97b-DRO8SqaO.js': { e:['../../source-artifact-adapters.jsx','ARTIFACT_WEEKDAY_FORMAT'] },
  'shared-20-BrTrXIRV.js': { Y: 'LocalizedMessage' },
  'cabf52553-BGQcEv7j.js': { x:['../../source-artifact-adapters.jsx','NoCloudArtifact'], X:['../../source-artifact-adapters.jsx','NoCloudArtifact'], ie:['../../source-artifact-adapters.jsx','formatArtifactCount'], F:['../../source-artifact-adapters.jsx','useArtifactIntl'], P:['../../source-artifact-adapters.jsx','ArtifactMessage'], p:'LocalLink', C:'SourceIcon', b:'HostTooltip', ve:['../../source-artifact-adapters.jsx','ArtifactMenu'], V:['../../source-artifact-adapters.jsx','useArtifactOwners'], H:['../../source-artifact-adapters.jsx','isSharedArtifact'], N:['../../source-artifact-adapters.jsx','useArtifactTypeChips'], ne:['../../source-artifact-adapters.jsx','useArtifactAnnouncement'], z:['../../source-artifact-adapters.jsx','useArtifactToday'], oe:['../../source-artifact-adapters.jsx','ArtifactThumbnail'], ee:['../../source-artifact-adapters.jsx','ArtifactDate'], j:['../../source-artifact-adapters.jsx','NoCloudArtifact'] },
  'cd75b47e6-6gS9HU0g.js': { t:['../../source-artifact-adapters.jsx','useArtifactBand'], n:'useDesktopFrame' },
  'cfcabf2fa--2rO5Hd_.js': { i:'SourceIcon', a:['../../source-artifact-adapters.jsx','artifactTypeInfo'] },

  'c71dee58b-CFLphdFa.js': { 'G': ['../../source-project-adapters.jsx', 'useProjectAnalytics'], 'Z': ['../../source-project-adapters.jsx', 'useProjectIntl'], 'Pt': ['../../source-project-adapters.jsx', 'useDesktopFrame'], 'It': ['../../source-project-adapters.jsx', 'useDesktopFrame'], 'ot': ['../../source-project-adapters.jsx', 'useNoProjectSharing'], 'ct': ['../../source-project-adapters.jsx', 'useNoProjectSharing'], 'Zi': ['../../source-project-adapters.jsx', 'useNoProjectSharing'], 'Tn': ['../../source-project-adapters.jsx', 'useNoProjectSharing'], 'wo': ['../../source-project-adapters.jsx', 'NoProjectSharing'], 'dl': ['../../source-project-adapters.jsx', 'projectSubtitle'], 'yr': ['../../source-project-adapters.jsx', 'useProjectMutation'], 'Sr': ['../../source-project-adapters.jsx', 'useProjectOptimisticUpdate'], 'ai': ['../../source-project-adapters.jsx', 'useLocalSpaceSelector'], 'Ln': ['../../source-project-adapters.jsx', 'LocalProjectMarker'], 'Oe': ['../../source-project-adapters.jsx', 'LocalProjectMenu'], 'Be': ['../../source-project-adapters.jsx', 'LocalProjectMenu'], 'aa': ['../../source-project-adapters.jsx', 'ProjectArchivedBadge'], 'Cn': ['../../source-project-adapters.jsx', 'ThemePortal'], 'Co': ['../../source-project-adapters.jsx', 'NoProjectSharing'], 'ul': ['../../source-project-adapters.jsx', 'NoProjectSharing'], 'vr': ['../../source-project-adapters.jsx', 'ProjectTypes'], 'X': ['../../source-project-adapters.jsx', 'LocalizedMessage'], 'q': ['../../source-project-adapters.jsx', 'HostButton'] },
  'cf8745532-uXq2n8pj.js': { r:'LocalLink', i:'ThemePortal' },
  'cbef3b9e7-kx1HRu8z.js': { r:'HostPictogram', i:'HostButton', a:'DensityRoot' },
  'cf35aed38-CgXOe11O.js': { g:'DisabledReasonTooltip', w:'SourceIcon', p:'HostButton', m:'HostMenuButton', v:'HostTooltip', x:'ThemePortal', y:'useLocalizedCopy', _:'useDesktopPlatform' },
  'c193cfc9b-B8oGoJPG.js': { s:'usePageLayer' },
  'cc5a62f6f-ylJcImQa.js': { l:'useDesktopFrame', d:'DensityRoot', f:'SourceIcon' },
  'ce5658dc8-CJ_gZ6YY.js': { Aa:'useDisabledTodoComment', ja:'DisabledTodoComment', pe:'useScopedState', J:'LocalizedMessage', G:'SourceIcon' },
  'shared-frame-C_2npUJq.js': {
    M:['../../source-field-adapters.jsx','NativeFieldRoot'],
    a:['../../source-field-adapters.jsx','NativeFieldLabel'],
    I:['../../source-field-adapters.jsx','NativeFieldDescription'],
    Re:['../../source-field-adapters.jsx','NativeFieldError'],
    p:['../../source-field-adapters.jsx','NativeFieldControl'],
    ks:'HostButton',
  },
  'shared-11-CDihEvbJ.js': { Ca:'Attachments', ka:'useAttachmentAnchor', ja:'AttachmentAnchorContext', rr:'Presence', oa:'SourceIcon', Yi:'ThemePortal' },
};
// The original ideas UI uses local prompt/editor services; its account feature
// experiment is replaced with the local catalog selection, not a cloud account.
Object.assign(adapters['shared-24-C4QZCHDk.js'], Object.fromEntries(Object.entries({
  Dp:'useIdeaSurface', Yl:'ideaTrue', Hg:'ideaFalse', ZD:'useLocalIdeas', oS:'ideaFalse',
  J:'useIdeaScope', f_:'ideaFalse', qc:'ideaFalse', Sh:'ideaTrue', XD:'useNoSkillIdeas',
  PD:'useIdeaAnalytics', KD:'useLocalIdeaSelection', JD:'loadIdeaCatalog', r_:'useIdeaPrompt',
  g_:'useIdeaEditor', Tp:'useIdeaCommands', qp:'useIdeaTarget', Em:'useIdeaTracker',
  Ge:'ideaMetricName', Be:'ideaMetricHash', Ep:'ideaCommandNodes', bh:'ideaCommandName',
  Wn:'IdeaLabel', dd:'illustrationColors',
}).map(([key, value]) => [key, ['../../source-ideas-adapters.jsx', value]])));
adapters['shared-24-C4QZCHDk.js'].ip = 'HostButton';
adapters['shared-24-C4QZCHDk.js'].yp = 'SourceIcon';
Object.assign(adapters['shared-21-D098Wd--.js'], {
  Z:['../../source-routine-adapters.jsx','useRoutineIntl'],
  Gr:['../../source-routine-adapters.jsx','useRoutineAnalytics'],
  Ko:['../../source-routine-adapters.jsx','useRoutineErrors'],
  sh:['../../source-routine-adapters.jsx','useRoutineBridge'],
  ta:['../../source-routine-adapters.jsx','noRemoteModel'],
  qi:['../../source-routine-adapters.jsx','noRemoteModel'],
  Yi:['../../source-routine-adapters.jsx','unavailableMigration'],
  zV:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  Ds:'HostButton', J:['../../source-routine-adapters.jsx','RoutineSourceMenu'], X:'LocalizedMessage',
});
// Local routines use the original card; cloud/device/code-only affordances are absent.
adapters['cdbc75b4b-CaOXO81D.js'] = {
  fi:['../../source-routine-adapters.jsx','RoutineMenu'],
  Xe:['../../source-home-adapters.jsx','useHomeNow'],
  ae:['../../source-routine-adapters.jsx','noRemoteModel'],
  ui:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  U:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  ti:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  ii:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  ci:['../../source-routine-adapters.jsx','UnavailableRoutineBadge'],
  je:['../../source-routine-adapters.jsx','routineAccent'],
  j:['../../source-routine-adapters.jsx','useRoutineIntl'],
  k:['../../source-artifact-adapters.jsx','messageDescriptors'],
};
// Original Scheduled detail: only account/device services and host primitives are adapted.
adapters['ccd3f68fe-JzfLnZNI.js'] = Object.fromEntries(Object.entries({
  xr:'UnavailableRoutineBadge', ht:'routinePermissionSupported',
  J:'useRoutineIntl', Mn:'useRoutineNow', Ft:'noRemoteModel', ur:'useScheduledCopy',
  ge:'noRemoteModel', Nn:'noRoutineTools', wt:'noRemoteModel', St:'noRemoteModel',
  at:'noRoutineDevice', et:'noRoutineDevice', da:'noRoutineEffect', Cr:'noDeviceConnectivity',
  wa:'noRoutineDevice', tr:'noRoutineEffect', yt:'noRemoteModel', ft:'noRemoteModel',
  ir:'useRoutineReadState', ct:'noRoutineTools', Wn:'routinePermissionDescription',
  ve:'UnavailableRoutineBadge', ii:'UnavailableRoutineBadge', vi:'UnavailableRoutineBadge',
  Gt:'RoutineConfirmation', Jt:'RoutineSwitch', Kt:'RoutineDialog',
  K:'RoutineFragment', en:'RoutineFragment', Er:'UnavailableRoutineBadge',
  A:'RoutineSessionStatus', Q:'routineToolLabel', We:'routinePermissionRule',
  V:'RoutineInfo',
  Fn:'noRoutineTools',
  rr:'UnavailableRoutineBadge',
  Yt:'RoutineCheckbox',
}).map(([key,value]) => [key,['../../source-routine-detail-adapters.jsx',value]]));
Object.assign(adapters['ccd3f68fe-JzfLnZNI.js'], {
  z:'HostButton', W:'HostTooltip', U:'DisabledReasonTooltip', G:'SourceIcon', I:'LocalLink',
  q:['../../source-routine-detail-adapters.jsx','RoutineMessage'], Zt:'ThemePortal',
});
const allowed = new Set(['c3d5d2a6f-Cb6r-Pna.js','c1c6ea9ac-D7jZ2mtx.js','shared-2-C6aD8DvJ.js','shared-19-CjdiaR4X.js','c9e1458cd-hPrW80tG.js','cdbc75b4b-CaOXO81D.js','c07677de0-ZWS1w1fw.js','c2d1766e9-DsxsFFHA.js','c32f7beb9-C22xyv_3.js','c1dd841c3-BG9tG1BD.js','caaf77b85-DdXwb3ur.js','vendor-icons-BwTxPg4q.js','c99caee80-CuPB6kUT.js','ce6cd4a83-B9FjZYye.js','c181900da-Bj4ombfg.js','c4a32f7fb-CEo1L0kf.js','c4059b025-jGtn5Q7K.js','c6ad19bb9-Dtnfr9wq.js','c0eaadb4f-BldfH7Qk.js','c86b36240-IEUa07AX.js','c97b955f1-6SCO-W37.js','rolldown-runtime-CAJkiChf.js','c511d59b8-Cjklq41c.js','c0958e5bf-6J5ZF7yM.js','cc09daa9b-cPVYGM-x.js','shared-0-8LmBcbZC.js','shared-3-YXRuSVZn.js','shared-9-Zi4BzzJw.js','shared-24-C4QZCHDk.js','vendor-intl-Cf4IuK3L.js','shared-22-Cz3C_T8d.js','shared-4-D8W6lHTW.js','shared-16-Cg1UfeMy.js','ca324bb72-DogKBzRY.js','shared-14-BOJVa-jT.js','c042dc97b-DRO8SqaO.js','cabf52553-BGQcEv7j.js','cd75b47e6-6gS9HU0g.js','c7e8a83e5-PPYu2Sp3.js','cfcabf2fa--2rO5Hd_.js','c71dee58b-CFLphdFa.js', 'c75e89812-U9wOm6Ly.js', 'cbcaf521a-CrWJ5SHy.js', 'cf8745532-uXq2n8pj.js', 'cbef3b9e7-kx1HRu8z.js', 'c193cfc9b-B8oGoJPG.js', 'cf35aed38-CgXOe11O.js', 'shared-15-hyCkawKO.js', 'shared-11-CDihEvbJ.js','shared-8-B5xbG2px.js','shared-frame-C_2npUJq.js','shared-21-D098Wd--.js', 'cc5a62f6f-ylJcImQa.js', 'ce5658dc8-CJ_gZ6YY.js', 'shared-7-DsClUbcz.js', 'shared-10-C1vQACzq.js', 'shared-20-BrTrXIRV.js']);
// The full scheduled form is source code; local services replace cloud/account hooks.
adapters['c97b955f1-6SCO-W37.js'] = Object.fromEntries(Object.entries({
  Et:'useRoutineIntl', Xt:'useFormCopy', rt:'useFormMessages', Gt:'useFormBridge',
  te:'formFeature', re:'formBridgeAvailable', Nt:'useFormPreferences', xe:'useFormAnalytics',
  Tn:'useOtherRoutineNames', le:'useFormModels', ve:'useModelUnavailable',
  Me:'useFormPermissions', Re:'formPermissionValue', Bt:'formPermissionItems', Ht:'formPermissionDescription', Lt:'usePermissionSelection',
  Ce:'useNoAccount', h:'useFormRouter', Tt:'formPermissionStore', Se:'formSeedVersion',
  bn:'useManualDraft', an:'useFormDebounce', nn:'alreadyAcknowledged', tn:'noFormEffect',
  Kt:'falseFeature', Ve:'falseFeature', ke:'noFormData', Ut:'noFormData', Je:'falseFeature',
  At:'falseFeature', jt:'falseFeature', Pt:'falseFeature', Mt:'falseFeature', Le:'falseFeature',
  nt:'falseFeature', qt:'falseFeature', it:'useNoProjectAccess', tt:'falseFeature', Qe:'falseFeature',
  Jt:'falseFeature', pe:'noFormData', et:'falseFeature', je:'noFormData', Ke:'falseFeature',
  Wt:'noFormEffect', ne:'formModelName', de:'identity', ce:'falseFeature',
  En:'hasRoutineName', He:'noLocalConstraint', Xe:'localSource', Ft:'useFormNow',
  ie:'useFormMedia', ae:'useStableFormEvent',
  ot:'FormConfirmation', st:'FormDialog', zt:'FormFolderPicker', gt:'FormSelect',
  // Not mounted: code-only onboarding, cloud device trust and project/cloud branches.
  An:'UnavailableFormBranch', jn:'UnavailableFormBranch', Mn:'UnavailableFormBranch', Nn:'UnavailableFormBranch',
  On:'UnavailableFormBranch', kn:'UnavailableFormBranch', Rt:'UnavailableFormBranch', It:'FormNotice',
  rn:'UnavailableFormBranch', ue:'UnavailableFormBranch',
  Dt:'falseFeature', Ot:'invokeFormOperation', kt:'falseFeature', he:'falseFeature', _e:'falseFeature',
  Vt:'formModelName', g:'noFormData', x:'noFormData', w:'noFormData',
  me:'noFormData', _:'falseFeature',
  se:'noFormEffect',
  Vn:'UnavailableFormBranch',
  pn:'UnavailableFormBranch',
}).map(([key,value]) => [key,['../../source-routine-form-adapters.jsx',value]]));
Object.assign(adapters['c97b955f1-6SCO-W37.js'], {
  C:['../../source-routine-detail-adapters.jsx','RoutineMessage'], S:['../../source-artifact-adapters.jsx','messageDescriptors'],
  at:'HostButton', ft:'DisabledReasonTooltip', xt:'SourceIcon',
  lt:['../../source-routine-detail-adapters.jsx','RoutineInfo'], dt:['../../source-routine-detail-adapters.jsx','RoutineSwitch'],
  ut:['../../source-routine-adapters.jsx','RoutineSourceMenu'],
  St:'LocalLink',
});
allowed.add('c439baf43-BL3Rl37w.js');
allowed.add('c615abdf4-CsD8WvEj.js');
allowed.add('c46686c0b-BrsMROUn.js');
allowed.add('cff2bf6cb-rlnyJMOd.js');
allowed.add('c8ff922bb-BPSJpmre.js');
adapters['cff2bf6cb-rlnyJMOd.js'] = { d:['../../source-calendar-adapters.jsx','CalendarButton'], g:['../../source-calendar-adapters.jsx','CalendarPopover'], y:['../../source-calendar-adapters.jsx','calendarLocale'] };
adapters['c8ff922bb-BPSJpmre.js'] = { f:['../../source-calendar-adapters.jsx','CalendarButton'], h:['../../source-calendar-adapters.jsx','calendarLocale'] };
adapters['caaf77b85-DdXwb3ur.js'] = { x:['../../source-routine-detail-adapters.jsx','RoutineSwitch'], S:['../../source-routine-form-adapters.jsx','FormSelect'], D:['../../source-routine-adapters.jsx','useRoutineIntl'],
  k:['../../source-routine-form-adapters.jsx','FormCatalogPicker'], j:['../../source-routine-form-adapters.jsx','identity'], A:['../../source-routine-form-adapters.jsx','formModelName'], d:['../../source-routine-form-adapters.jsx','formModelName'], y:'HostCollapsible' };
adapters['c615abdf4-CsD8WvEj.js'] = { n:['../../source-routine-adapters.jsx','useRoutineIntl'] };
// SC-7: the two unreachable modules that render a TextInput (caaf77b85's cron field in the scheduled form and
// cf35aed38's page-header search) import the 2.42304.0 TextInput (shared-frame tx) by its view-tabs semantic
// name instead of pulling in the 2.2553.1 Bh. Checked before writing: each local is that module's import of
// shared-frame Bh, and view-tabs publishes CdsTextInput from the file named here.
const viewTabsTextInput = ['../view-tabs/shared-frame-BfjMqbuN.js', 'CdsTextInput'];
const textInputRedirects = [['caaf77b85-DdXwb3ur.js', 'w'], ['cf35aed38-CgXOe11O.js', 'b']];
for (const [file, local] of textInputRedirects) adapters[file][local] = viewTabsTextInput;
// SC-7: the native-field registry (source-field-adapters.jsx) learns this family's parts from the family module
// itself, as code-current environment-field-controls and source-routines do for theirs. The adapter module used to
// import them from shared-frame, which imports the adapter module back: whichever of the two loaded first decided
// whether the registry held the parts or undefined.
const registrations = { 'shared-frame-C_2npUJq.js': { call: 'registerNativeFieldComponents', from: '../../source-field-adapters.jsx',
  parts: { Field: '_y', Label: 'vy', Description: 'yy', ErrorText: 'by', TextInput: 'Bh', TextArea: '$v' } } };
async function get(name) {
  if (modules.has(name)) return modules.get(name);
  const code = await fs.readFile(path.join(source,name),'utf8');
  const ast = await parsers.babel.parse(code); let program;
  babel.traverse(ast,{Program(p){program=p;}});
  const exports = new Map();
  for(const node of ast.program.body) if(node.type==='ExportNamedDeclaration') for(const s of node.specifiers) exports.set(s.exported.name,s.local.name);
  const m={name,code,program,exports,selected:new Map(),literals:new Map(),initializers:new Map(),imports:new Map(),seen:new Set()}; modules.set(name,m); return m;
}
// Some container classes are inline in the service-heavy page component. Copy the
// literal AST node, not a second handwritten spelling, and record its source range.
function addSourceLiteral(m, owner, name, prefix) {
  const matches = [];
  m.program.scope.getBinding(owner).path.traverse({ StringLiteral(p) {
    if (p.node.value.startsWith(prefix)) matches.push(p.node);
  } });
  if (matches.length !== 1) throw Error(`Expected one source literal ${m.name}:${owner}:${name}, found ${matches.length}`);
  m.literals.set(name, matches[0]);
}
async function add(m,name) {
  if(m.seen.has(name))return; m.seen.add(name);
  if(adapters[m.name]?.[name]) { const adapter = adapters[m.name][name]; m.imports.set(name, Array.isArray(adapter) ? adapter : ['../../source-chat-adapters.jsx', adapter]); return; }
  const binding=m.program.scope.getBinding(name); if(!binding)throw Error(`Unbound ${m.name}:${name}`);
  const p=binding.path;
  if(p.isImportSpecifier()) {
    const filename=p.parent.source.value.slice(2), exported=p.node.imported.name;
    if(filename==='vendor-frame-BmPfNbgY.js'&&vendor[exported]) {m.imports.set(name,vendor[exported]);return;}
    if(!allowed.has(filename))throw Error(`External boundary ${m.name}:${name} = ${filename}:${exported}`);
    const dependency=await get(filename), local=dependency.exports.get(exported);
    if(!local)throw Error(`Missing export ${filename}:${exported}`);
    m.imports.set(name,['./'+filename,local]);await add(dependency,local);return;
  }
  m.selected.set(name,p);
  const deps=new Set();
  p.traverse({ReferencedIdentifier(r){const b=r.scope.getBinding(r.node.name);if(b?.scope===m.program.scope)deps.add(r.node.name);}});
  for(const dep of deps) { try { await add(m,dep); } catch (error) { throw new Error(`${m.name}:${name} → ${error.message}`); } }
}
// These two audited React Aria calendar modules assign locale dictionaries
// after declaring them, and initialize focus/transition tracking at module
// scope. Keep those statements in source order, along with their dependencies;
// declarations alone would silently leave the dictionaries empty.
async function addCalendarInitializers(m) {
  for (const statement of m.program.get('body')) {
    if (!statement.isExpressionStatement()) continue;
    m.initializers.set(statement.node.start, statement);
    const dependencies = new Set();
    statement.traverse({ ReferencedIdentifier(p) {
      const binding = p.scope.getBinding(p.node.name);
      if (binding?.scope === m.program.scope) dependencies.add(p.node.name);
    }, AssignmentExpression(p) {
      const left = p.get('left');
      if (left.isIdentifier() && left.scope.getBinding(left.node.name)?.scope === m.program.scope) dependencies.add(left.node.name);
    } });
    for (const name of dependencies) await add(m, name);
  }
}
// SC-7: shared-14 Ga/qa (tv/ev, the 2.2553.1 artifact body and header classes) are no longer forced in: nothing
// imported them. The live artifact body class is current-chat shared-9 xf (source-artifact-viewer.jsx).
const shell=await get('shared-11-CDihEvbJ.js');
await add(await get('vendor-frame-BmPfNbgY.js'), 'qt');
await add(await get('vendor-frame-BmPfNbgY.js'), 'Wt');
await add(await get('vendor-frame-BmPfNbgY.js'), 'Lt');
await add(await get('cdbc75b4b-CaOXO81D.js'), 'pi');
await add(await get('cdbc75b4b-CaOXO81D.js'), '$r');
await add(await get('shared-21-D098Wd--.js'), 'VV');
await add(await get('shared-19-CjdiaR4X.js'), 'lm');
await add(await get('shared-19-CjdiaR4X.js'), 'dm');
await add(await get('c97b955f1-6SCO-W37.js'), 'xr');
for (const name of ['c8ff922bb-BPSJpmre.js', 'cff2bf6cb-rlnyJMOd.js']) await addCalendarInitializers(await get(name));
await add(await get('ccd3f68fe-JzfLnZNI.js'), 'ga');
for (const name of ['fo', 'co', 'so']) await add(await get('ccd3f68fe-JzfLnZNI.js'), name);
addSourceLiteral(await get('ccd3f68fe-JzfLnZNI.js'), 'uo', 'routineTemplateGridClass', 'grid w-full grid-cols-1 gap-x-6');
await add(await get('vendor-intl-Cf4IuK3L.js'), 'kt');
addSourceLiteral(await get('ccd3f68fe-JzfLnZNI.js'), 'Zo', 'routineGridClass', 'mb-3 grid auto-rows-fr grid-cols-1');
// The field family (registered with the native-field registry, see `registrations`) and the Spark (bd). Bh, the
// 2.2553.1 TextInput, stays for this family's TextField (Sy) and for the host CsvTextInput (source-csv-adapters.jsx,
// also SidebarSectionsInput); the Code UI terminal find already uses view-tabs CdsTextInput (2.42304.0 tx).
for (const name of ['Bh', '$v', 'bd', 'Sy', '_y', 'vy', 'yy', 'by']) await add(await get('shared-frame-C_2npUJq.js'), name);
await add(await get('shared-24-C4QZCHDk.js'), 'tE');
await add(await get('shared-24-C4QZCHDk.js'), 'TD');
await add(await get('shared-24-C4QZCHDk.js'), 'QD');
await add(await get('c2bf50d9e-DFTwgP_Q.js'), 'o');
await add(await get('shared-22-Cz3C_T8d.js'), 'xO');
await add(await get('vendor-intl-Cf4IuK3L.js'), '$t');
for (const name of ['dO','aO']) await add(await get('shared-21-D098Wd--.js'), name);
const home = await get('shared-24-C4QZCHDk.js');
addSourceLiteral(home, 'SO', 'homeColumnClass', 'relative flex flex-col items-center gap-6');
addSourceLiteral(home, 'SO', 'homeScrollClass', 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto');
addSourceLiteral(await get('shared-14-BOJVa-jT.js'), 'ZP', 'ideaPreviewClass', 'animate-preview-prompt-in line-clamp-2 text-muted');
for(const name of ['Gu','$l','cu','uu','lu','fu'])await add(shell,name);
const layout=await get('shared-21-D098Wd--.js');
for(const name of ['yb','Ab','jb','Nb','bb','Lx','mb','Fb','Xb'])await add(layout,name);
// Editor typography, insets and intrinsic row metrics belong to the same original contract.
const geometry=await get('shared-8-B5xbG2px.js');
for(const exported of ['mp','hp'])await add(geometry,geometry.exports.get(exported));
const activity = await get('ce5658dc8-CJ_gZ6YY.js');
for (const name of ['yu', 'bu', 'xu']) await add(activity, name);
const activityLayout = await get('cc5a62f6f-ylJcImQa.js');
for (const name of ['O', 'A', 'm', 'h', 'v', '_', 'y']) await add(activityLayout, name);
for (const [file, names] of [['ca324bb72-DogKBzRY.js',['yt','It']], ['cabf52553-BGQcEv7j.js', ['Le','Ee']], ['cfcabf2fa--2rO5Hd_.js', ['f','p']], ['c71dee58b-CFLphdFa.js', ['wl']], ['c75e89812-U9wOm6Ly.js', ['i', 'a']], ['cbcaf521a-CrWJ5SHy.js', ['e']], ['cf8745532-uXq2n8pj.js', ['l']], ['cbef3b9e7-kx1HRu8z.js', ['s']], ['c193cfc9b-B8oGoJPG.js', ['g']]]) { const mod = await get(file); for (const name of names) await add(mod, name); }
const viewTabsManifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8'));
if (viewTabsManifest.publicNames?.[viewTabsTextInput[1]]?.file !== path.basename(viewTabsTextInput[0]))
  throw Error(`view-tabs does not publish ${viewTabsTextInput[1]} from ${path.basename(viewTabsTextInput[0])}`);
for (const [file, local] of textInputRedirects) {
  const m = modules.get(file), binding = m?.program.scope.getBinding(local);
  const from = binding?.path.isImportSpecifier() ? binding.path.parent.source.value.slice(2) : null;
  if (from !== 'shared-frame-C_2npUJq.js' || (await get(from)).exports.get(binding.path.node.imported.name) !== 'Bh')
    throw Error(`${file}:${local} is not that module's import of shared-frame Bh`);
  if (m.imports.get(local) !== viewTabsTextInput) throw Error(`${file}:${local} was not redirected`);
}
await fs.mkdir(output,{recursive:true});
const provenance=[];
for(const m of modules.values()) {
  const registration = registrations[m.name];
  if (registration) {
    if (m.program.scope.hasBinding(registration.call)) throw Error(`${m.name} already binds ${registration.call}`);
    for (const [role, local] of Object.entries(registration.parts)) if (!m.selected.has(local)) throw Error(`${m.name}: ${role} part ${local} is not extracted`);
  }
  const imports=[...m.imports].map(([local,[from,name]])=>`import { ${name} as ${local} } from ${JSON.stringify(from)};`).join('\n')
    + (registration ? `\nimport { ${registration.call} } from ${JSON.stringify(registration.from)};` : '');
  const register = registration ? `${registration.call}({ ${Object.entries(registration.parts).map(([role, local]) => `${role}: ${local}`).join(', ')} });\n` : '';
  const declarations=[...m.selected.values(), ...m.initializers.values()].sort((a,b)=>a.node.start-b.node.start).map(p=>(p.isVariableDeclarator()?'var ':'')+m.code.slice(p.node.start,p.node.end)+(p.isVariableDeclarator()?';':'')).join('\n').replaceAll('\"/images/illustrations/', '\"./images/illustrations/').replaceAll('\"/assets/v1/', '\"./assets/v1/');
  const literals=[...m.literals].map(([name,node])=>`var ${name}=${m.code.slice(node.start,node.end)};`).join('\n');
  const body=`// Extracted from Claude Desktop 2.2553.1 ${m.name}. Only asset URLs are made relative. Do not edit.\n${imports}\n${declarations}\n${literals}\n${register}export { ${[...m.selected.keys(), ...m.literals.keys(), ...m.imports.keys()].join(', ')} };\n`;
  await fs.writeFile(path.join(output,m.name),body);
  provenance.push({source:m.name,outputSha256:createHash('sha256').update(body).digest('hex'),assetUrls:'Root paths made relative for Electron file loading',sha256:createHash('sha256').update(m.code).digest('hex'),declarations:[...m.selected.keys()],literals:[...m.literals].map(([name,node])=>({name,start:node.start,end:node.end})),...(m.initializers.size ? { initializers: [...m.initializers.values()].map(p => ({ start:p.node.start, end:p.node.end })) } : {}),...(registration ? { registrations: [registration] } : {}),boundaries:[...m.imports].filter(([,v])=>!v[0].startsWith('./shared'))});
}
await fs.writeFile(path.join(output,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(`Chat UI: extracted ${provenance.reduce((n,m)=>n+m.declarations.length,0)} declarations from ${modules.size} source modules.`);
