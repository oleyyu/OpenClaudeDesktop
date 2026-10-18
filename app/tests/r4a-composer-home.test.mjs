// R4a test lock (moved from tests-r4a/ at the R4g/R4h gate), audit group A-composer-home (official 2.42304.0): home-09, composer-11, composer-12, composer-14, cov2-03.
// Each test pins (a) the official 2.42304.0 strings that decide the behaviour (count(official(...), text)) and (b) the
// local counterpart: the local .mjs models run on fixtures, and for JSX closures the exact source lines that decide it.
// Two official pure functions (cc43287c9 aK, shared-52 mb, c8eb45883 d, cc43287c9 SU) are evaluated from their shipped
// text so the local models are compared against the originals, not against a paraphrase. Nothing renders, no vite.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale } from '../electron/i18n/index.mjs';
import { greetingName, greetingText } from '../src/home-model.mjs';
import { greetingFor } from '../src/persona-store.mjs';
import { PERSONA_DEFAULT } from '../electron/prefs/persona.mjs';
import { clawdClassName, clawdReplayButtonClassName } from '../src/generated/code-start/pet.mjs';
import { IMAGE_TYPES, IMAGE_TYPE_ERROR, planFolderPaste, splitClipboardFolders, stageFiles } from '../src/composer-attachments-model.mjs';
import { DRAFT_STORAGE_PREFIX, persistDraft, readPersistedDraft, saveDraft, takeDraft } from '../src/composer-draft-store.mjs';
import { routeComposerIntake } from '../src/generated/code-composer/composer-intake-route.mjs';
import { splitTransferItems, composerImageMimeTypes } from '../src/generated/code-composer/composer-intake-split.mjs';
import { savedPermission } from '../electron/preferences.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const previous = path.resolve(app, '../reference/installed-2.37337.1-20261015');
const cache = new Map();
const official = (name, root = reference) => {
  const file = path.join(root, 'ion-dist/assets/v1', name);
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
};
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles, label) => { for (const needle of needles) assert.equal(count(text, needle), 1, `${label}: ${needle}`); };
const u = text => text.replaceAll('’', '\\u2019'); // the minified chunks spell ’ as \u2019
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
// The shipped text of one pure function, from its declaration up to the next marker.
const between = (text, start, end) => {
  const at = text.indexOf(start);
  assert.ok(at >= 0, start);
  const stop = text.indexOf(end, at + start.length);
  assert.ok(stop > at, end);
  return text.slice(at, stop);
};
// A CSS rule block `selector { … }` from a hand-written stylesheet.
const cssBlock = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, selector);
  return css.slice(at, css.indexOf('}', at) + 1);
};

setLocale('en-US');

// ── home-09 ────────────────────────────────────────────────────────────────────────────────────────────────────────
test('home-09 official: jU is the only greeting header (22px spark + h1, no centered variant) and the presets gate hides it', () => {
  const session = official('cc43287c9-DAfOi8yP.js');
  once(session, [
    // jU takes shimmerOnMount and scopeStore only: there is no layout/centered prop any more.
    'var jU=O(({shimmerOnMount:e,scopeStore:t})=>{let{account:n}=Ne(),r=SU(CU,Mr(),n?.full_name),i=OU(kU(Th())),a=tp(t,e=>e.landingClear??i),[o]=f(!!e)',
    'return p("header",{className:nl,children:[v(Ku,{size:22,className:`${al} ${o?"epitaxy-pill-pulse":""}`}),v("h1",{className:"text-title text-primary",children:s})]})});',
    u('v(Z,{defaultMessage:"What’s up next, {name}?",id:"flLEnDzvfG",values:{name:r}})'),
    u('v(Z,{defaultMessage:"What’s up next?",id:"W8pMCdh9hq"})'),
    'v(Z,{defaultMessage:"Welcome back, {name}",id:"UOxi8mioge",values:{name:r}})',
    'v(Z,{defaultMessage:"Welcome back",id:"UKxoV8UIxo"})',
    'var CU=!0;',
    // The draft page mounts jU only while the session-presets gate is off (ie = P_() = shared-11 Qo).
    '!I&&!ie&&!Ot&&le==="draft"&&!_e&&v("div",{className:"relative",children:v(jU,{shimmerOnMount:k,scopeStore:U})})',
    'ie=P_()', ',do as P_,', ',Ud as nl,', ',Wd as al,',
  ], 'cc43287c9');
  assert.equal(count(session, 'v(jU,'), 1, 'jU has one mount');
  assert.equal(count(session, 'centered'), 0, 'no centered variant anywhere in cc43287c9');
  const header = official('shared-6-Cby4X-ms.js');
  once(header, ['_g=`w-full ${fg} flex flex-row items-center gap-1.5 pt-[12px] pb-[24px]`', 'jg="shrink-0 translate-y-px"', '_g as Ud', 'jg as Wd'], 'shared-6');
  assert.equal(count(header, 'centered'), 0);
  const gates = official('shared-11-BuQ3CK5I.js');
  once(gates, ['Zo="claudeai_cc_epitaxy_session_presets_main"', 'function Qo(){return N(Zo)}', 'Qo as do', 'Th as N'], 'shared-11');
});

test('home-09 local: SourceGreeting matches jU (22px spark + h1, landingClear copy, SU name) and, as in jU under D10, the code draft does not mount it', () => {
  const session = official('cc43287c9-DAfOi8yP.js');
  // SU(CU=true, preferred, fullName) from the shipped text against home-model greetingName (the persona store's input).
  const SU = new Function(`${between(session, 'function SU(e,t,n){', 'var CU=!0;')}; return SU;`)();
  for (const name of ['  Fixture ', 'a.b@example.com', 'Ada Lovelace', '', '   ', undefined, 'not@an@email'])
    assert.equal(greetingName(name), SU(true, name, 'Full Name'), JSON.stringify(name));
  // jU's four messages follow landingClear and the name; the default persona (no custom greeting) shows exactly them.
  const copy = { 'true:Ada': 'What’s up next, Ada?', 'true:': 'What’s up next?', 'false:Ada': 'Welcome back, Ada', 'false:': 'Welcome back' };
  for (const landingClear of [true, false]) for (const displayName of ['Ada', undefined]) {
    const expected = copy[`${landingClear}:${displayName ?? ''}`];
    assert.equal(greetingText(greetingName(displayName), landingClear), expected);
    assert.equal(greetingFor({ displayName, landingClear }, PERSONA_DEFAULT), expected);
  }
  const home = local('src/source-home.jsx');
  once(home, [
    'export function SourceGreeting({ displayName, landingClear = true, shimmerOnMount = true }) {',
    '<header className="welcome-heading source-greeting">',
    'alt="" width="22" height="22" />',
    '<PersonaSparkGlyph persona={persona} size={22} className={"claude-spark" + (pulse ? " source-spark-pulse" : "")} />',
    '<h1>{greetingFor({ displayName, landingClear }, persona)}</h1>',
  ], 'source-home.jsx');
  const css = local('src/source-home.css');
  for (const text of [home, css]) assert.equal(count(text, 'centered'), 0);
  // _g: full width, flex row, items-center, gap-1.5 (6px), pt 12 / pb 24; jg: shrink-0 translate-y-px; h1 text-title.
  assert.equal(cssBlock(css, '.welcome-heading'), '.welcome-heading {\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 6px;\n  width: 100%;\n  padding: 12px 0 24px;\n  margin: 0;\n}');
  assert.equal(cssBlock(css, '.claude-spark'), '.claude-spark {\n  width: 22px;\n  height: 22px;\n  flex-shrink: 0;\n  transform: translateY(1px);\n}');
  assert.match(cssBlock(css, '.welcome-heading h1'), /font-size: var\(--cds-font-size-title, 20px\);/);
  // D10 takes claudeai_cc_epitaxy_session_presets_main "on": the code draft shows the start card, never a greeting
  // (official: `!ie&&` hides jU). SourceGreeting stays imported but unmounted.
  assert.equal(count(local('src/source-r3b-transcript-adapters.jsx'), 'export const HOST_GATES = Object.freeze({ claudeai_cc_epitaxy_session_presets_main: true });'), 1);
  const main = local('src/main.jsx');
  assert.equal(count(main, '<SourceGreeting'), 0);
  // The welcome block holds the start card only (no SourceGreeting). Since the R4 integration it is mounted by session/draft
  // state alone, as shared-20 sh (the home layout always holds the chat tile, so the old openPanes.size===0 guard never rendered it).
  assert.match(main, /\{!current && mode === "code" && \(\s*<div className="welcome">\s*\{\/\* Official start card \(shared-20 sh\)[^\n]*\n\s*\{<SourceCodeStart /);
});

// ── composer-11 ────────────────────────────────────────────────────────────────────────────────────────────────────
const O7 = 'absolute right-[-13px] bottom-[calc(var(--cds-ring-outer,0px)-144px/11)] w-[80px] h-[80px] -scale-x-100';
const REPLAY = "border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-none [&_path:not([fill-opacity='0'])]:pointer-events-auto";
test('composer-11 official: k7 puts ClawdLaptop at O7 (right -13px, bottom ring-outer - 144px/11) above the draft composer', () => {
  const session = official('cc43287c9-DAfOi8yP.js');
  once(session, [
    `O7="${O7}"`,
    'k7=O(()=>{let e=G$(e=>e.token),t=V$(),n=rd(2),r=x(()=>({zIndex:n}),[n]);return v("div",{className:`relative h-0 pointer-events-none ${Nl}`,style:r,children:(n=>t?v(D7,{className:"absolute right-[-16px] bottom-[-8px] w-[80px]"}):v(LB,{replayToken:e,listeningLoop:n,className:O7,replayOnClick:!0}))(!1)})})',
    // V$ is the CCR teleport context (absent → false), so the laptop sprite with O7 is the default branch.
    'function V$(){return S(z$)?.active??!1}',
    'Cc=Cn==="draft"?!Ot&&v(k7,{}):null',
    ',ud as Nl,',
  ], 'cc43287c9');
  assert.equal(count(session, 'bottom-[-13px]'), 0, 'the old -16/-13 laptop offsets are gone');
  once(official('shared-6-Cby4X-ms.js'), [',Lg="-mb-1.5 compact:-mb-1.5 comfortable:-mb-2"', 'Lg as ud'], 'shared-6');
  once(official('cc13f8cc7--_rF5jpy.js'), [`className:\`\${r??""} ${REPLAY}\`,children:S}`], 'cc13f8cc7');
});

test('composer-11 local: SourcePet uses the generated O7 binding, the loaded original CSS resolves it, and no host rule overrides it', () => {
  // Generated, not hand-copied: pet.mjs is extract-code-start output from the 2.42304.0 chunk (manifest hashes).
  assert.equal(clawdClassName, O7);
  assert.equal(clawdReplayButtonClassName, REPLAY);
  const manifest = JSON.parse(local('src/generated/code-start/manifest.json'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  const pet = manifest.outputs.find(entry => entry.target === 'pet.mjs');
  assert.deepEqual(pet.bindings.map(binding => [binding.name, binding.export]), [['O7', 'clawdClassName']]);
  assert.equal(pet.sourceSha256, sha(fs.readFileSync(path.join(reference, 'ion-dist/assets/v1/cc43287c9-DAfOi8yP.js'))));
  assert.equal(pet.sha256, sha(fs.readFileSync(path.join(app, 'src/generated/code-start/pet.mjs'))));
  assert.equal(pet.fragments[0].sha256, sha(REPLAY));
  // The button carries exactly O7 + the replay classes; the slot is k7's wrapper (relative, 0 high, no pointer events,
  // z-index 2) with Nl's compact margin (-mb-1.5 = -6px at --spacing .25rem).
  const source = local('src/source-pet.jsx');
  once(source, [
    'import { clawdClassName, clawdReplayButtonClassName } from "./generated/code-start/pet.mjs";',
    '<div className={`sc-pet-slot ${className}`} aria-hidden="true" style={{ zIndex: 2 }}>',
    'className={`${clawdClassName} ${clawdReplayButtonClassName}`}',
  ], 'source-pet.jsx');
  const css = local('src/source-composer.css');
  assert.equal(count(css, '.sc-pet-slot { position: relative; height: 0; margin-bottom: -6px; pointer-events: none; }'), 1);
  // The original stylesheet index.html loads defines every O7 utility with the official values.
  assert.equal(count(local('index.html'), '<link rel="stylesheet" href="/assets/v1/c6a992d55-sXiDGMFQ.css" />'), 1);
  const sheet = local('public/assets/v1/c6a992d55-sXiDGMFQ.css');
  for (const rule of ['.absolute{position:absolute}', '.right-\\[-13px\\]{right:-13px}',
    '.bottom-\\[calc\\(var\\(--cds-ring-outer\\,0px\\)-144px\\/11\\)\\]{bottom:calc(var(--cds-ring-outer,0px) - 144px / 11)}',
    '.w-\\[80px\\]{width:80px}', '.h-\\[80px\\]{height:80px}', '.-scale-x-100{--tw-scale-x:calc(100% * -1);scale:var(--tw-scale-x) var(--tw-scale-y)}',
    '.-mb-1\\.5{margin-bottom:calc(var(--spacing) * -1.5)}'])
    assert.equal(count(sheet, rule), 1, rule);
  assert.match(sheet, /--spacing:\.25rem/);
  // The host .sc-pet rules (presets right:-13px…, base right:-16px/bottom:-13px) are dead: no element has class sc-pet.
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(name => /\.(jsx|mjs)$/.test(name)))
    assert.doesNotMatch(local(`src/${file}`), /["'`\s]sc-pet(?![-\w])/, file);
  // k7 sits directly before the composer card: the pet mounts right before the <form> on the draft page (code, no session).
  // R3-composer step 3: the Code card root is the composer shell's CardRoot (a div for Code, the form for Chat/Cowork); the pet still sits right before it.
  assert.match(local('src/source-composer.jsx'), /\{showPet && <SourcePet \/>\}\n(?:\s*\{\/\*[\s\S]*?\*\/\}\n)?\s*<CardRoot ref=\{card\}/);
  assert.equal(count(local('src/main.jsx'), 'showPet={mode === "code" && !current && !error && !draft.startsWith("/")}'), 1);
});

// ── composer-12 ────────────────────────────────────────────────────────────────────────────────────────────────────
const officialImageTypes = () => {
  const text = official('shared-52-DGviI8xb.js');
  const literal = between(text, ',Dy=[', ']');
  assert.equal(count(text, ',Dy=["image/jpeg","image/png","image/gif","image/webp"],Oy=Dy,'), 1);
  return JSON.parse(literal.slice(',Dy='.length) + ']');
};
const officialRouter = () => new Function('gj', `${between(official('cc43287c9-DAfOi8yP.js'), 'function aK({files:e,folders:t},n){', 'function oK(')}; return aK;`)(officialImageTypes());
const officialSplit = () => new Function(`${between(official('shared-52-DGviI8xb.js'), 'function mb(e,t){', 'async function*hb(')}; return mb;`)();
const file = (name, type, extra = {}) => ({ name, type, size: 10, ...extra });
const item = (value, isDirectory = false) => ({ kind: 'file', getAsFile: () => value, webkitGetAsEntry: () => ({ isDirectory }) });
const names = list => list.map(entry => entry.name);
const spyHandlers = ({ otherFiles = true, folders = true } = {}) => {
  const calls = { images: [], otherFiles: [], folders: [] };
  return { calls, handlers: { images: list => calls.images.push(...list), ...(otherFiles ? { otherFiles: list => calls.otherFiles.push(...list) } : {}),
    ...(folders ? { folders: list => calls.folders.push(...list) } : {}) } };
};

test('composer-12 official: paste, drop and the file picker all route through aK (images / otherFiles / folders)', () => {
  const session = official('cc43287c9-DAfOi8yP.js');
  once(session, [
    'function aK({files:e,folders:t},n){let r=e.filter(e=>gj.includes(e.type)),i=e.filter(e=>!gj.includes(e.type)),a=n.otherFiles?[]:[...i,...n.folders?[]:t];return r.length+a.length>0&&n.images([...r,...a]),i.length>0&&n.otherFiles?.(i),t.length>0&&n.folders?.(t),r.length>0||n.otherFiles!==void 0&&i.length>0||n.folders!==void 0&&t.length>0}',
    'Yh=A((e,t)=>aK(e,{images:e=>{let n=za.current?.addImageFiles(e)??0;n>0&&(qf("attach"),hE({image_count:n,source:t}))},otherFiles:Nh?e=>{qf("attach"),Uh(e)}:void 0,folders:Jh}),[Nh,Uh,Jh,qf])',
    'Xh=A(e=>{Yh(e,"drop"),Na.current?.scheduleFocus()},[Yh])',
    '$h=A(e=>{ir()&&(Yh({files:e,folders:[]},"file_picker"),Na.current?.scheduleFocus())},[Yh,ir])',
    'eg=A(e=>{Yh(mo(e.clipboardData?.items,e.clipboardData?.files),"paste")&&(e.preventDefault(),Na.current?.scheduleFocus())},[Yh])',
    // A local environment has both lanes: otherFiles (Nh = ju || …) and folders (Jh exists while qh = ju).
    'Nh=ju||Bu||Mf', 'ju=G?G.type==="local"&&!q?.remote:Y.envType==="local"',
    'qh=ju,Jh=x(()=>{if(qh)return e=>{if(e.length!==0){if(pd==="draft"&&!zc&&!Ad){let t=ho(e[0]);t&&Pd(t)}else Um(_G(e,ho,!0).map(e=>e.relativePath));Na.current?.scheduleFocus()}}},[qh,pd,zc,Ad,Pd,Um])',
    'if(ju&&(pa||!G)){za.current?.addFileAttachments(_G(e,ho));return}',
    'function _G(e,t,n=!1){let r=Date.now();return e.map((e,i)=>{let a=t?.(e);return{id:`file-${e.name}-${r}-${i}`,fileName:e.name,relativePath:a??e.name,isDirectory:n}})}',
    ',Bl as mo,', ',El as ho,', ',r as gj}',
  ], 'cc43287c9');
  assert.equal(count(session, 'aK('), 2, 'one definition, one caller (Yh)');
  once(official('shared-52-DGviI8xb.js'), [
    'function mb(e,t){let n=[],r=[];if(!e)return{folders:n,files:Array.from(t??[])};for(let t=0;t<e.length;t++){let i=e[t];if(i.kind!=="file")continue;let a=i.getAsFile();a&&(i.webkitGetAsEntry?.()?.isDirectory?n.push(a):r.push(a))}return{folders:n,files:r}}',
    'function Gb(e){if(!Wb())return null;try{return window.claudeAppSettings.filePickers.getPathForFile(e)}catch{return null}}',
    'mb as Bl', 'Gb as El', 'Dy as Tu',
  ], 'shared-52');
  // aK with every lane wired (the local-environment composer): each kind reaches its own lane, nothing is refused.
  const route = officialRouter();
  const { calls, handlers } = spyHandlers();
  const handled = route({ files: [file('a.png', 'image/png'), file('notes.txt', 'text/plain')], folders: [file('src', '')] }, handlers);
  assert.deepEqual([names(calls.images), names(calls.otherFiles), names(calls.folders), handled], [['a.png'], ['notes.txt'], ['src'], true]);
  // Without otherFiles/folders lanes (not the local-environment composer) everything falls into the image lane.
  const bare = spyHandlers({ otherFiles: false, folders: false });
  assert.equal(route({ files: [file('notes.txt', 'text/plain')], folders: [file('src', '')] }, bare.handlers), false);
  assert.deepEqual(names(bare.calls.images), ['notes.txt', 'src']);
});

test('composer-12 local: paste and drop run the original mb and aK (generated), stage images and files like aK, and send folders to the folder route', () => {
  const split = officialSplit();
  const png = file('a.png', 'image/png', { path: '/w/a.png' }), txt = file('notes.txt', 'text/plain', { path: '/w/notes.txt' });
  const folder = file('src', '', { path: '/w/src' });
  const fixtures = [
    [[item(png), item(txt), item(folder, true), { kind: 'string', getAsFile: () => null }, item(null)], [png, txt, folder]],
    [undefined, [png, txt]],
    [[], [png]],
  ];
  for (const [items, files] of fixtures) {
    const mine = splitClipboardFolders(items, files), theirs = split(items, files);
    assert.deepEqual([names(mine.folders), names(mine.files)], [names(theirs.folders), names(theirs.files)]);
  }
  // Image detection: the same four MIME types as gj (shared-52 Dy).
  assert.deepEqual([...IMAGE_TYPES].sort(), officialImageTypes().sort());
  // Path-backed files (Finder paste/drop, the picker): images → image entries, others → file entries, as images/otherFiles.
  const route = officialRouter();
  const mixed = [png, txt, file('b.webp', 'image/webp', { path: '/w/b.webp' }), file('c.pdf', 'application/pdf', { path: '/w/c.pdf' })];
  const { calls, handlers } = spyHandlers();
  route({ files: mixed, folders: [] }, handlers);
  const staged = stageFiles([], mixed, { makeId: index => `id-${index}` });
  assert.deepEqual(staged.notices, []);
  assert.deepEqual(names(staged.added.filter(entry => entry.kind === 'image')), names(calls.images));
  assert.deepEqual(names(staged.added.filter(entry => entry.kind === 'file')), names(calls.otherFiles));
  // Folders: Jh → a draft with no working folder takes the first one (Pd), otherwise Um adds them; planFolderPaste does both.
  assert.deepEqual(planFolderPaste(['/a', '/b'], { draft: true, workdir: '' }), { workingFolder: '/a' });
  assert.deepEqual(planFolderPaste(['/w/x'], { draft: false, workdir: '/w', sessionOpen: true }), { chips: ['/w/x'], grant: [], draftFolders: [] });
  // R4g-composer CP4: the route is the original now — generated composer-intake-split.mjs (shared-52 mb, Dy) and
  // composer-intake-route.mjs (cc43287c9 aK over c98ab6e79 r = Dy): same results as the shipped text on every fixture.
  assert.deepEqual(composerImageMimeTypes, officialImageTypes());
  for (const [items, files] of fixtures) {
    const mine = splitTransferItems(items, files), theirs = split(items, files);
    assert.deepEqual([names(mine.folders), names(mine.files)], [names(theirs.folders), names(theirs.files)]);
  }
  for (const [input, lanes] of [
    [{ files: [png, txt], folders: [folder] }, {}], [{ files: [txt], folders: [folder] }, { otherFiles: false, folders: false }],
    [{ files: [], folders: [folder] }, { folders: false }], [{ files: [file('x', '')], folders: [] }, {}], [{ files: [], folders: [] }, {}],
  ]) {
    const a = spyHandlers(lanes), b = spyHandlers(lanes);
    assert.deepEqual([routeComposerIntake(input, a.handlers), a.calls], [route(input, b.handlers), b.calls]);
  }
  // The JSX closures: paste and drop split with mb and go through aK; its answer is when paste stops the text paste and a
  // drop is claimed; images and other files → onStageFiles, folders → onAddFolders (undefined lane without it, as Jh is).
  const composer = local('src/source-composer.jsx');
  assert.equal(count(composer, [
    '  const intake = (split, source) => routeComposerIntake(split, {',
    '    images: (files) => onStageFiles(files, { source, imagesAllowed: modelAcceptsImages(model) }),',
    '    otherFiles: (files) => onStageFiles(files, { source, imagesAllowed: modelAcceptsImages(model) }),',
    '    folders: onAddFolders ? (folders) => onAddFolders(folders, { source }) : undefined,',
    '  });',
  ].join('\n')), 1, 'one route');
  assert.equal(count(composer, '    if (intake(splitTransferItems(event.clipboardData?.items, event.clipboardData?.files), "paste")) event.preventDefault();'), 1, 'paste');
  assert.equal(count(composer, '    if (intake(splitTransferItems(event.dataTransfer?.items, event.dataTransfer?.files), "drop")) event.preventDefault();'), 1, 'drop');
  assert.equal(count(composer, 'splitClipboardFolders'), 0, 'no host split left in the composer');
  assert.equal(count(composer, 'const acceptsFiles = !!onStageFiles && editable;'), 1);
  const main = local('src/main.jsx');
  once(main, ['onStageFiles={(files, options) => void stageComposerIntake(files, options)}', 'onAddFolders={addFolderFiles}',
    // imageNotice: IMAGE_OFF_ERROR when image input is off for the model in Settings › Models (imageRefusedNotice).
    'const staged = stageFiles(entries, files, { imagesAllowed, imageNotice });',
    'const plan = planFolderPaste(paths, { draft: !currentRef.current, workdir, sessionOpen: !!currentRef.current });'], 'main.jsx');
});

// R4g-composer CP4: the route is aK itself (above); what the host does after it, per lane, differs from the official
// lanes in three decided host differences (kept: each serves the host's path-based attachments, see R4g-composer-CP4.md),
// and the /btw side pane is equivalent (R4g-btw BT1: the official jT child-pane composer takes no attachments either).
test('composer-12 host differences (decided, R4g CP4): pathless non-images, typeless pasted folders, extension-only images; btw equivalent', () => {
  const route = officialRouter();
  // (1) A pathless non-image (raw clipboard/drag data): aK sends it to otherFiles → _G(e, ho) with relativePath =
  // webUtils.getPathForFile() = "" (mainView.js), i.e. a file chip and no notice. Local (decided): the host core reads an
  // attachment from its path, so a chip with an empty path would send nothing; stageComposerFiles' clipboard lane runs
  // stageFiles(imagesOnly) → the image-type notice and no entry.
  const raw = file('clip.bin', 'application/octet-stream');
  const one = spyHandlers();
  assert.equal(route({ files: [raw], folders: [] }, one.handlers), true);
  assert.deepEqual([names(one.calls.images), names(one.calls.otherFiles)], [[], ['clip.bin']]);
  assert.equal(count(fs.readFileSync(path.join(reference, 'asar/.vite/build/mainView.js'), 'utf8'), 'var Pr={filePickers:{getPathForFile:t=>e.webUtils.getPathForFile(t)}}'), 1);
  const lane = stageFiles([], [{ name: 'clip.bin', size: 10, type: 'application/octet-stream', previewUrl: 'blob:x' }], { imagesOnly: true });
  assert.deepEqual([lane.added, lane.notices], [[], [IMAGE_TYPE_ERROR]]);
  const main = local('src/main.jsx');
  assert.equal(count(main, 'const second = stageFiles(next, clipboard.map((item) => ({ name: item.name, size: item.size, type: item.type, previewUrl: URL.createObjectURL(item.file) })), { imagesOnly: true, imagesAllowed: allowed, imageFallback, imageNotice });'), 1);
  // (2) A pasted Finder folder whose clipboard item does not report isDirectory (typeless, path-backed): aK attaches it
  // through otherFiles as a file (_G isDirectory false). Local (decided): stageComposerIntake checks it on disk and takes
  // the folder route (a folder the core would otherwise be asked to read as a file).
  const two = spyHandlers();
  route({ files: [file('src', '', { path: '/w/src' })], folders: [] }, two.handlers);
  assert.deepEqual([names(two.calls.otherFiles), names(two.calls.folders)], [['src'], []]);
  once(main, [
    'const unknown = files.map((file) => ({ file, path: !file.type && typeof api?.pathForFile === "function" ? api.pathForFile(file) : "" })).filter((item) => item.path);',
    'if (folders.length) takeFolderPaths(folders.map((item) => item.real));',
  ], 'main.jsx stageComposerIntake');
  // (3) A typeless file named *.png: gj.includes(type) says not an image (otherFiles); local (decided): isImageFile also
  // reads the extension, so it is staged as the image it is (previewed, sent as localImage).
  const three = spyHandlers();
  route({ files: [file('shot.png', '', { path: '/w/shot.png' })], folders: [] }, three.handlers);
  assert.deepEqual(names(three.calls.otherFiles), ['shot.png']);
  assert.equal(stageFiles([], [file('shot.png', '', { path: '/w/shot.png' })]).added[0].kind, 'image');
  // (4) Equivalent (R4g-btw BT1, tests/btw-pane-render.test.mjs pins the official jT): the /btw side-session composer
  // passes neither onStageFiles nor onAddFolders, so acceptsFiles is false and paste/drop take nothing, as officially.
  const btw = between(local('src/source-btw-pane.jsx'), '<SourceComposer key={sessionId}', 'folderMenu={false}/>');
  assert.match(btw, /codeLayout="side-session"/);
  assert.doesNotMatch(btw, /onStageFiles|onAddFolders/);
});

// ── composer-14 ────────────────────────────────────────────────────────────────────────────────────────────────────
test('composer-14 official: no draft-level permission persistence; baseMode = userChoice ?? settings ?? folder pick ?? repo ?? global', () => {
  const resolver = official('c8eb45883-BKWHnsew.js');
  once(resolver, [
    'function d({userChoice:e,userSettingsDefault:t,repoSettingsDefault:n,folderChoice:r,globalPref:i,consultedStoredGlobalPref:a,storedPickLayersSettled:o}){return{baseMode:e??t??r??n??i,',
    'function u({storedGlobalPref:e,accountGlobalPref:t,autoDefaultAllowed:n}){let r=l(t)??l(e);if(n){let e=r==="default"||r==="acceptEdits"||r==="auto"?r:null;return{globalPref:e??"auto",consultedStoredGlobalPref:e}}return{globalPref:r==="auto"?"acceptEdits":r??"acceptEdits",consultedStoredGlobalPref:r}}',
    'export{s as a,c as i,d as n,u as r,o as t};',
  ], 'c8eb45883');
  const layered = new Function(`${between(resolver, 'function d({', 'export{')}; return d;`)();
  const base = { userChoice: null, userSettingsDefault: undefined, repoSettingsDefault: undefined, folderChoice: undefined, globalPref: 'auto', consultedStoredGlobalPref: null, storedPickLayersSettled: true };
  assert.equal(layered(base).baseMode, 'auto');
  assert.equal(layered({ ...base, folderChoice: 'acceptEdits' }).baseMode, 'acceptEdits');
  assert.equal(layered({ ...base, folderChoice: 'acceptEdits', userChoice: 'default' }).baseMode, 'default');
  assert.equal(layered({ ...base, folderChoice: 'acceptEdits', userSettingsDefault: 'default' }).baseMode, 'default');
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  once(composer, [
    'import{a as _y,i as vy,n as yy,r as by,t as xy}from"./c8eb45883-BKWHnsew.js"',
    // userChoice lives in the opening's memory (zt), starting null; a folder's pick is the account-scoped folder map.
    '[q,tt]=zt(E,()=>null)',
    '[Ge,Ke]=Bc("epitaxy-folder-permission-mode",BI,{scope:"account"})',
    'Ze=Xe?Ge[Xe]:void 0,Qe=Ze==="plan"?void 0:Ze',
    '{baseMode:ft,baseModeSource:pt,hasExplicitChoice:ht,spawnModeIsProvisional:gt}=M(()=>yy({userChoice:q,userSettingsDefault:Ie,repoSettingsDefault:Le,folderChoice:Qe,globalPref:De,consultedStoredGlobalPref:Oe,storedPickLayersSettled:ct})',
    'lt?.state==="provider_default"',
    // A Mode-menu pick sets userChoice and the folder's pick, never the global pref …
    '_=!!h&&o!=="approval_card"&&a!=="plan"&&!(a==="bypassPermissions"&&zI(h));tt(a),_&&Ke(e=>({...e,[h]:a}))',
    // … which (cc-landing-draft-permission-mode) only the auto-default nudge writes (DI O).
    '[be,xe]=Bc("cc-landing-draft-permission-mode",null,{scope:"account"})',
    '{globalPref:De,consultedStoredGlobalPref:Oe}=by({storedGlobalPref:ye,accountGlobalPref:be,autoDefaultAllowed:Te})',
    'setGlobalPref:xe', 'O=H(()=>(n("auto"),a("auto")),[a,n])',
  ], 'c227f4d5e');
  assert.equal(count(composer, 'draftPersistKey'), 0);
  // cc43287c9 still names draftPersistKey, but only for the attachment shelf (YG) and the spawn inputs (ru), not a mode.
  const session = official('cc43287c9-DAfOi8yP.js');
  assert.equal(count(session, 'draftPersistKey'), 6);
  once(session, ['var YG=O(function({ref:e,scopeStore:t,draftPersistKey:n,', 'ru({openingKey:r,draftPersistKey:n,sessionRef:G,'], 'cc43287c9');
  // The persisted draft record (shared-1 lC) has no permission field.
  const drafts = official('shared-1-CAAiD7E3.js');
  assert.equal(count(drafts, 'permissionMode'), 0);
  once(drafts, ['Yx="composer-draft:"', 'return{...n!==void 0&&{text:n},...a!==void 0&&{seedPrint:a},...o!==void 0&&{rewound:o},...Array.isArray(t.files)&&{files:t.files},...Array.isArray(t.snippets)&&{snippets:t.snippets},...r!==void 0&&{agent:r},...i!==void 0&&{failedSend:i},'], 'shared-1');
});

test('composer-14 local: drafts never carry a permission; the mode is layered like c8eb45883 d (pick, folder pick, Settings default) and a pick never saves the default', async () => {
  // The draft stash and the persisted draft drop anything but text / mentions / attachments.
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; } };
  assert.equal(persistDraft(storage, 'epitaxy-draft', { text: 'hi', permissionMode: 'plan', permission: 'acceptEdits', attachments: [], mentions: [] }, { now: 5 }), true);
  assert.deepEqual(Object.keys(JSON.parse(memory.get(`${DRAFT_STORAGE_PREFIX}epitaxy-draft`))), ['text', 'mentions', 'attachments', 'savedAt']);
  assert.deepEqual(readPersistedDraft(storage, 'epitaxy-draft'), { text: 'hi', mentions: [], attachments: [] });
  assert.deepEqual(takeDraft(saveDraft(new Map(), 'k', { text: 'hi', permissionMode: 'plan' }), 'k').draft, { text: 'hi', attachments: [], mentions: [] });
  assert.equal(count(local('src/composer-draft-store.mjs'), 'ermission'), 0);
  // The draft's base mode is the original d (generated byte slice), fed by the host layers (R4g-composer CP6).
  const { resolvePermissionBaseMode } = await import('../src/generated/permission-mode/resolution.mjs');
  const shipped = official('c8eb45883-BKWHnsew.js');
  const layeredShipped = new Function(`${between(shipped, 'function d({', 'export{')}; return d;`)();
  for (const input of [{ userChoice: null, folderChoice: 'acceptEdits', globalPref: 'auto', consultedStoredGlobalPref: 'auto', storedPickLayersSettled: true },
    { userChoice: 'plan', folderChoice: 'acceptEdits', globalPref: 'ask', consultedStoredGlobalPref: 'ask', storedPickLayersSettled: true },
    { userChoice: null, globalPref: 'auto', consultedStoredGlobalPref: null, storedPickLayersSettled: false }])
    assert.deepEqual(resolvePermissionBaseMode(input), layeredShipped(input));
  const { initialPermissionLayers, permissionLayersReducer, permissionOpeningKey, resolveOpeningMode, FOLDER_PERMISSION_KEY } = await import('../src/permission-mode-resolution.mjs');
  assert.equal(FOLDER_PERMISSION_KEY, 'epitaxy-folder-permission-mode');
  // The ledger's visible case: acceptEdits picked in folder A, then a new draft in folder B shows the Settings default.
  const draft = permissionOpeningKey({});
  let state = permissionLayersReducer(initialPermissionLayers({}), { type: 'folder', openingKey: draft, folderKey: '/A' });
  state = permissionLayersReducer(state, { type: 'pick', openingKey: draft, folderKey: '/A', value: 'acceptEdits', current: 'auto' });
  state = permissionLayersReducer(state, { type: 'folder', openingKey: draft, folderKey: '/B' });
  const shown = folder => resolveOpeningMode({ userChoice: state.choices[draft] ?? null, folderChoice: state.folders[folder], globalPref: savedPermission({ permission: 'ask' }) }).mode;
  assert.equal(shown('/B'), 'ask');
  assert.equal(shown('/A'), 'acceptEdits');
  // main.jsx: the saved Settings default is the global layer, and the Mode-menu pick goes to the layers, not preference().
  const main = local('src/main.jsx');
  once(main, ['[permission, setPermission] = useState("auto"),', 'setPermission(savedPermission(b.config));',
    'const permissionLayers = usePermissionModeLayers({ globalPref: permission, settled: initSettled, sessionId: current, surface: mode, bypassOptIn,',
    'layers: permissionLayers, onChange: (value, how) => permissionLayers.pick(value, how)});', 'onChange={value => bypassMode.select(value)}'], 'main.jsx');
  assert.equal(count(main, 'preference("permission"'), 0);
  assert.equal(savedPermission({ permission: 'acceptEdits' }), 'acceptEdits');
  assert.equal(savedPermission({}), 'auto');
  // The bypass hook reads the layered mode and hands every pick to onChange (the layers' pick).
  const bypass = local('src/source-bypass-permission.jsx');
  once(bypass, ["else { clear(); setPending(null); onChange(value); }", "const resolved = layers ? layers.mode : permission;",
    "onChange(value, 'approval_card'); return;"], 'source-bypass-permission.jsx');
});

// ── cov2-03 ────────────────────────────────────────────────────────────────────────────────────────────────────────
const SLOTS = ['ops', 'paused', 'environment', 'acorn', 'credits', 'effort', 'workflow', 'limit', 'refusal', 'sleep', 'keptAwake', 'bridge', 'repository', 'credentialNudge'];
test('cov2-03 official: the 14-slot card stack exists only behind GrowthBook __gb__100087145; without GrowthBook N5 renders its children as bands', () => {
  const stack = official('c227f4d5e-Ba-r--Rl.js');
  once(stack, [`$P=${JSON.stringify(SLOTS)}`, 'var ZP=F(!1);function QP(){return P(ZP)}', '$P as wo', 'iF as To', 'ZP as Oo'], 'c227f4d5e');
  // 2.37337.1 had 13 slots: acorn is the new one (between environment and credits).
  assert.equal(count(official('ca80fca8d-vl1ck1Sv.js', previous), `OR=${JSON.stringify(SLOTS.filter(slot => slot !== 'acorn'))}`), 1);
  const session = official('cc43287c9-DAfOi8yP.js');
  once(session, [
    'var M5="__gb__100087145";function N5({mountKey:e,composerOnly:t,children:n}){let r=he(M5,!0),[i]=Tn(e,()=>r);return i?v("div",{[ul]:"",className:t?void 0:el,children:v(Zt,{className:t?void 0:"min-h-0",children:v("div",{[xn]:"",[jl]:"",className:t?Fl:`${hl} min-h-0`,children:v(Ny.Provider,{value:!0,children:v(Qy,{session:e,children:n})})})})}):n}',
    ',Nh as he,', ',wo as Jx,', ',To as Qy,', ',Oo as Ny,',
  ], 'cc43287c9');
  const flags = official('shared-25-DP8p7i1Z.js');
  once(flags, ['function ec(e,t){let n=ks();return!t||!n?.growthbook?!1:As(n,I(e)).on}', 'ec as Nh'], 'shared-25');
});

test('cov2-03 local: no GrowthBook, so the closed branch: SourceSessionNotices is the band list above the composer, no slot table or cards', () => {
  const notices = local('src/source-session-notices.jsx');
  once(notices, [
    'if (!shown.length && !extra) return null;',
    'return <div className="ssn-list" role="region" aria-label={t("Notices")}>',
    'return <div key={key} className="ssn-notice" data-kind={notice.kind} data-level={notice.level || undefined} role="status">',
  ], 'source-session-notices.jsx');
  for (const slot of ['acorn', 'keptAwake', 'credentialNudge', '__gb__100087145']) assert.equal(count(notices, slot), 0, slot);
  assert.equal(count(local('src/main.jsx'), '<SourceSessionNotices'), 1);
  // The host has no GrowthBook client: the adapters that mention it document the missing ks()?.growthbook.
  assert.match(local('src/source-sessions-adapters.jsx'), /OpenClaude has no GrowthBook client/);
});
