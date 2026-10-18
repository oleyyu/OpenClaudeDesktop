// R4a lock-in for the R3 audit group A-transcript-topbar (target 2.42304.0): cov4-03, cov6-04, transcript-04,
// transcript-06, topbar-08, topbar-09, topbar-12, tasks-07. Every test pins (a) the official 2.42304.0 text by
// occurrence counts and (b) the local counterpart: a pure-model call where one exists, a Vite SSR render where the
// markup is the behaviour, and the deciding source line otherwise. topbar-09 is NOT equivalent today: its test
// asserts the current difference and says what the official path does, so it flips when the work item lands
// (cov4-03 was the second such item; R4e-small aligned it). Nothing here launches Electron or a browser, calls a core, or reads a user profile.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { setLocale, DEFAULT_LOCALE, dictionary, tn } from '../electron/i18n/index.mjs';
import { collectFindText, findMatches } from '../src/transcript-find-model.mjs';
import { fileGroupPresentation, fileGroupSummary } from '../src/file-tool-model.mjs';
import { titlebarControlClass } from '../src/titlebar-controls-model.mjs';
import { sessionArchived } from '../src/sidebar-model.js';
import { createClipboardFeedback } from '../src/clipboard-feedback.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const assetsDir = path.join(reference, 'ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(assetsDir, name), 'utf8');
const officialMain = name => fs.readFileSync(path.join(reference, 'asar/.vite/build', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => {
  for (const needle of needles) assert.equal(count(text, needle), expected, needle);
};
// One pass over every official renderer asset, for the "nowhere in 2.42304.0" counts.
let assetScan;
function scanAssets() {
  if (assetScan) return assetScan;
  const js = [], css = [];
  for (const name of fs.readdirSync(assetsDir)) {
    if (name.endsWith('.js')) js.push(fs.readFileSync(path.join(assetsDir, name), 'utf8'));
    else if (name.endsWith('.css')) css.push(fs.readFileSync(path.join(assetsDir, name), 'utf8'));
  }
  assetScan = { js, css, files: js.length + css.length };
  return assetScan;
}
const total = (texts, needle) => texts.reduce((sum, text) => sum + count(text, needle), 0);

// Vite SSR for the four renders that are the behaviour (Markdown pipeline, titlebar, plan copy button).
let server, S, T, P, I;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // SourceDialog portals to <body>; the server renderer has none (as source-titlebar-tooltips.test.mjs does).
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  S = await server.ssrLoadModule('/src/source-session.jsx');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  P = await server.ssrLoadModule('/src/source-plan-pane.jsx');
  // The SSR graph has its own i18n instance; the locale switch below must reach that one.
  I = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });
const h = React.createElement;
const renderMessage = (text) => renderToStaticMarkup(h(S.SourceMessage, {
  item: { id: 'r4a-fixture', type: 'agentMessage', text }, sessionKey: 'r4a-session', cwd: '/fixture',
  onOpenFileRef() { throw new Error('Rendering is not file activation'); },
}));
const renderTitlebar = (props = {}) => renderToStaticMarkup(h(T.SourceTitlebar, {
  section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {}, ...props }));
function inLocale(locale, run) {
  I.setLocale(locale);
  try { return run(); } finally { I.setLocale(DEFAULT_LOCALE); }
}

// A minimal DOM for the find model (as tests/transcript-find-model.test.mjs builds it).
function link(parent, children) {
  let previous = null;
  for (const child of children) {
    child.parentNode = parent;
    if (previous) previous.nextSibling = child; else parent.firstChild = child;
    previous = child;
  }
}
const textNode = (data) => ({ nodeType: 3, data, nextSibling: null, parentNode: null });
function el(tag, attrs = {}, ...children) {
  const nodes = children.flat().map((child) => (typeof child === 'string' ? textNode(child) : child));
  const element = {
    nodeType: 1, tagName: tag.toUpperCase(), attrs, firstChild: null, nextSibling: null, parentNode: null,
    hasAttribute: (name) => Object.hasOwn(attrs, name),
    getAttribute: (name) => (Object.hasOwn(attrs, name) ? attrs[name] : null),
    classList: { contains: (name) => String(attrs.class ?? '').split(/\s+/).includes(name) },
  };
  link(element, nodes);
  return element;
}

// ---------------------------------------------------------------------------------------------------------------
// cov4-03 transcript find (⌘F) skips icon glyphs.
test('cov4-03 official: the find walk skips [data-cds=Icon]:not(svg) and [data-cds=Avatar] without a run break', () => {
  const walk = official('shared-15-Cc9xvKlF.js');
  pin(walk, [
    "ha='[data-cds=\"Avatar\"]'",
    'import{En as Ye,',
    // Excluded / gutter subtrees end the run (s = true) …
    'if(r?.has(i)||i.hasAttribute(pa)){s=!0;return}',
    // … an icon or avatar is skipped silently: no s = true, so the text on both sides stays one run.
    'if(Ye(i)||i.matches(ha))return;',
    // The run break is a NUL before the next text node.
    's&&=(o+="\\0",!1)',
  ]);
  const icons = official('shared-6-Cby4X-ms.js');
  pin(icons, ["vV='[data-cds=\"Icon\"]:not(svg)';function yV(e){return e.matches(vV)}", 'yV as En,']);
});

test('cov4-03 local: the glyph is never matched and skipping it keeps the run (as official shared-15 Ca)', () => {
  // The local Icon is a span[aria-hidden][data-cds=Icon] holding the font glyph (icons.jsx), the transcript has no Avatar.
  assert.match(local('src/icons.jsx'), /<span\n\s+aria-hidden="true"\n\s+data-cds="Icon"/);
  const avatars = fs.readdirSync(path.join(app, 'src')).filter((name) => /\.(jsx|mjs|js)$/.test(name))
    .filter((name) => /data-cds=["']Avatar|"data-cds":\s*["']Avatar/.test(local(`src/${name}`)));
  assert.deepEqual(avatars, []);
  const glyph = String.fromCodePoint(0xe0a1);
  const icon = () => el('span', { 'aria-hidden': 'true', 'data-cds': 'Icon' }, glyph);
  // The forge chip shape (response-markdown-render: <a …><span whitespace-nowrap><span …><Icon/></span>acme/widgets#42).
  const root = el('p', {}, 'See ', el('a', {}, el('span', {}, el('span', {}, icon()), 'acme/widgets#42')), ' now.');
  // Equivalent half: the glyph is not in the searchable text and never matches; the row's own text does.
  assert.equal(collectFindText(root).text.includes(glyph), false);
  assert.deepEqual(findMatches(root, glyph), []);
  assert.equal(findMatches(root, 'acme/widgets#42').length, 1);
  // The deciding local lines (R4e-small): exclude / gutter still end the run, then — after the included / omitted
  // handling, in shared-15's order — an Icon (not svg) or Avatar returns without setting the gap, and only then does
  // the local F10 aria-hidden / sr-only / hidden rule break the run.
  const model = local('src/transcript-find-model.mjs');
  assert.match(model, /if \(exclude\?\.has\(node\) \|\| node\.hasAttribute\(FIND_GUTTER\)\) \{ gap = true; return; \}/);
  assert.match(model, /return \(kind === "Icon" && String\(element\.tagName\)\.toLowerCase\(\) !== "svg"\) \|\| kind === "Avatar";/);
  const order = ['if (exclude?.has(node) || node.hasAttribute(FIND_GUTTER)) { gap = true; return; }', 'else if (node.hasAttribute(FIND_OMITTED)) {',
    'if (skippedWithoutBreak(node)) return;', 'if (hiddenFromFind(node)) { gap = true; return; }'].map((line) => model.indexOf(line));
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), `walk order ${order}`);
  // Now equivalent: official shared-15 builds "\0See acme/widgets#42 now." (no break at the icon), and so does the
  // local walk, so "See acme" finds the chip.
  assert.equal(collectFindText(root).text, '\0See acme/widgets#42 now.');
  assert.equal(findMatches(root, 'See acme').length, 1);
  // An avatar is skipped the same way (official ha), even though no local transcript renders one today.
  const avatar = el('p', {}, 'by ', el('span', { 'data-cds': 'Avatar' }, 'AB'), 'Ada');
  assert.equal(collectFindText(avatar).text, '\0by Ada');
});

// ---------------------------------------------------------------------------------------------------------------
// cov6-04 inline HTML tags as literal text, no owner/repo#N autolink inside them.
test('cov6-04 official: with the fixes table (__gb__3019411446) a tag is one text node marked tag, and the GitHub ref pass skips it', () => {
  const parser = official('c86867935-hxCMagMP.js');
  pin(parser, [
    'if(l?.inlineHtmlTagIsText){let n=He(e,f);if(n>f||n===P&&!t){let t=n>f?n:e.length;u.push({kind:"text",value:e.slice(f,t),tag:!0}),f=t;continue}',
    // Gate off: "<" is a literal character and the rest of the tag is parsed as ordinary inline text.
    'O("<"),f++;continue}',
  ]);
  pin(official('cae93ec19-DTe7M-jg.js'), ['else if(i.kind==="text"&&!i.tag){C.lastIndex=0;']);
  const markdown = official('c19e90103-muBq-gyt.js');
  pin(markdown, [
    'linkDestinationRules:!0,inlineHtmlTagIsText:!0,',
    'Sm={...bm,fixes:ym},Cm={...xm,fixes:ym};function wm(e,t){return t?e?Sm:Cm:e?bm:xm}',
    'var Qf=g(!0);function $f(){let e=b(Qf),t=I("__gb__3019411446");return e&&t}',
    'function wb(){return wm(ss(),$f())}',
    'Th as I,',
  ]);
  // shared-25 Th = Zs: a GrowthBook flag that is not in the payload evaluates off.
  pin(official('shared-25-DP8p7i1Z.js'), ['function Zs(e){return Rs(I(e)).on}', 'Zs as Th']);
});

test('cov6-04 local: react-markdown turns the raw tag into literal text (the fixes-on result) and nothing autolinks owner/repo#N', () => {
  // react-markdown 10.1.0 without rehype-raw: a raw node becomes {type: 'text'} (lib/index.js transform).
  const library = fs.readFileSync(path.join(app, 'node_modules/react-markdown/lib/index.js'), 'utf8');
  assert.equal(JSON.parse(fs.readFileSync(path.join(app, 'node_modules/react-markdown/package.json'), 'utf8')).version, '10.1.0');
  assert.match(library, /if \(node\.type === 'raw' && parent && typeof index === 'number'\) \{\n\s+if \(skipHtml\) \{\n\s+parent\.children\.splice\(index, 1\)\n\s+\} else \{\n\s+parent\.children\[index\] = \{type: 'text', value: node\.value\}/);
  const session = local('src/source-session.jsx');
  assert.doesNotMatch(session, /rehype-raw|rehypeRaw|skipHtml/);
  assert.match(session, /<Markdown remarkPlugins=\{remarkPlugins\} rehypePlugins=\{rehypePlugins\}\n\s+urlTransform=/);
  // The rendered transcript: the whole tag stays verbatim (no emphasis, link or element from inside it) …
  const html = renderMessage('Use <span title="*x* acme/widgets#7 https://example.test/a">y</span> here.');
  assert.match(html, /Use &lt;span title=&quot;\*x\* acme\/widgets#7 https:\/\/example\.test\/a&quot;&gt;y&lt;\/span&gt; here\./);
  assert.doesNotMatch(html, /<em>|<a |<span title=/);
  // … and a bare owner/repo#N is plain text locally anyway (the local forge chip only rewrites GitHub URLs).
  const bare = renderMessage('See acme/widgets#7 for it.');
  assert.match(bare, /See acme\/widgets#7 for it\./);
  assert.doesNotMatch(bare, /<a /);
});

// ---------------------------------------------------------------------------------------------------------------
// transcript-04 chapter list rows: app-list-row is a marker class; the tick is its own component.
test('transcript-04 official: the row and the editing row carry h-control app-list-row rounded-[5px]; no CSS or selector reads app-list-row', () => {
  const chapters = official('cf74bc599-D9NZWRyl.js');
  pin(chapters, ['h-control app-list-row rounded-[5px]'], 2);
  pin(chapters, [
    'o("li",{className:"flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px]"',
    'className:`group/ch hit-row-main w-full flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px] text-start hover:bg-fill-ghost-hover ${n?"text-primary":"text-secondary hover:text-primary"}`',
    'Sb=y(function({active:e}){return u("li",{className:"h-[8px] flex items-center",children:u("span",{className:`block h-[2px] rounded-full transition-[scale,background-color] duration-200 ${e?mb:pb}`})})})',
    'children:t.map(e=>u(Sb,{active:e.id===C},e.id))',
  ]);
  const { js, css } = scanAssets();
  assert.equal(total(css, 'app-list-row'), 0, 'no 2.42304.0 stylesheet has an app-list-row rule');
  assert.equal(total(js, '.app-list-row'), 0, 'no 2.42304.0 script selects .app-list-row');
});

test('transcript-04 local: the same rows (h-control height, 5px radius) and the 8px tick, without the inert marker', () => {
  const jsx = local('src/source-chapters.jsx');
  assert.match(jsx, /if \(isEditing\) return <li className="sch-toc-entry sch-toc-editing">/);
  assert.match(jsx, /<button ref=\{button\} type="button" className="sch-toc-entry sch-toc-button" data-active=\{isActive \? "" : undefined\}/);
  assert.match(jsx, /\{chapters\.map\(\(chapter\) => <li key=\{chapter\.id\} className="sch-toc-tick">\n\s+<span className="sch-toc-line" data-active=\{chapter\.id === active \? "" : undefined\} \/>/);
  const css = local('src/source-chapters.css');
  assert.match(css, /\.sch-toc-entry \{[^}]*padding: 0 5px;\s+height: var\(--cds-h-control, 24px\); border-radius: 5px; \}/);
  assert.match(css, /\.sch-toc-tick \{ height: 8px; display: flex; align-items: center; \}/);
  assert.match(css, /\.sch-toc-line \{ display: block; height: 2px;[^}]*border-radius: 9999px;/);
  // The marker has no local rule either, so omitting it changes nothing.
  for (const file of [...fs.readdirSync(path.join(app, 'src')).filter((name) => name.endsWith('.css')).map((name) => `src/${name}`),
    'public/assets/current-chat/layout.css'])
    assert.equal(count(local(file), 'app-list-row'), 0, file);
});

// ---------------------------------------------------------------------------------------------------------------
// transcript-06 activity summary verb and count copy: new ids, same English.
test('transcript-06 official: "read" now carries id xh2bkrlyzo with the same English; the old id is gone', () => {
  const summary = official('c24951e9f-Z0jxt9H6.js');
  pin(summary, ['defaultMessage:"read",id:"xh2bkrlyzo"'], 2);
  pin(summary, ['case"read":return{verb:e.formatMessage({defaultMessage:"read",id:"xh2bkrlyzo"}),meta:e.formatMessage({defaultMessage:"{n, plural, one {a file} other {# files}}",id:"5+tW8GNGYS"},{n})}']);
  pin(official('c96d752d0-BOCqU7c2.js'), ['read_file:{defaultMessage:"read",id:"SR7wroQgS1"}']);
  assert.equal(total(scanAssets().js, '7gIcWqlMVf'), 0);
});

test('transcript-06 local: the summary is keyed by the English copy, so the id change cannot reach it', () => {
  const source = local('src/file-tool-model.mjs');
  assert.match(source, /const words = \{ add: t\('created'\), update: t\('edited'\), delete: t\('deleted'\), read: t\('read'\),/);
  assert.match(source, /const COUNT_META = \{ file: \['a file', '\{count\} files'\],/);
  const read = (id, file) => ({ id, type: 'commandExecution', status: 'completed', command: `Read ${file}`, commandActions: [{ type: 'read', path: `/w/${file}` }] });
  assert.equal(fileGroupSummary([read('r1', 'a.ts'), read('r2', 'b.ts')]).label, 'Read 2 files');
  assert.equal(fileGroupPresentation([read('r1', 'a.ts'), read('r2', 'b.ts')]).segments[0].verb, 'Read');
  assert.deepEqual(fileGroupSummary([read('r1', 'a.ts')]), { label: 'Read a.ts', path: '/w/a.ts' });
  const zh = dictionary('zh-CN');
  assert.equal(zh.read, '读取了');
  setLocale('zh-CN');
  try {
    assert.equal(fileGroupSummary([read('r1', 'a.ts'), read('r2', 'b.ts')]).label, `${zh.read} ${tn(2, 'a file', '{count} files')}`);
    assert.equal(fileGroupSummary([read('r1', 'a.ts'), read('r2', 'b.ts')]).label, '读取了 2 个文件');
    assert.equal(fileGroupSummary([read('r1', 'a.ts')]).label, '读取了 a.ts');
  } finally { setLocale(DEFAULT_LOCALE); }
});

// ---------------------------------------------------------------------------------------------------------------
// topbar-08 when "Keep computer awake" is offered in the session's View options.
test('topbar-08 official: KU offers it for a local, unarchived, non-cloud session when codeSessionKeepAwake is supported; rt hides it for shared/cli', () => {
  const session = official('cc43287c9-DAfOi8yP.js');
  pin(session, [
    'function KU(e,t){let n=Sa(),r=n!==null&&Di(n,"codeSessionKeepAwake").status==="supported",i=J?.setManualKeepAwake,a=!t&&e?.type==="local"?e.id:void 0,',
    'c=r&&e?.type==="local"&&s&&!s.isArchived&&!s.isCloudRun?e.id:void 0',
    'ne=!k||VM(k)||aC(k.tags)!==void 0',
    'U=KU(e,k&&{isArchived:k.isArchived,isCloudRun:k.isCloudRun,manualKeepAwake:k.manualKeepAwake})',
    'let nt=kv(e?.type,k,z),rt=!!k&&ne||nt',
    'keepAwake:rt?void 0:U',
  ]);
  // VM = shared session, kv = a cli session or an agent session someone else started.
  pin(official('c5cd1b4dc-jDcYG_fG.js'), ['function wa(e){return e?.isShared===!0&&e.metaSource!=="seed"}']);
  pin(official('shared-16-B0xHzPjj.js'), ['function cf(e,t,n){return e==="cli"||Zd(t)&&!of(t?.startedByAccountId,n)}']);
  // The View options row it feeds.
  pin(official('cf74bc599-D9NZWRyl.js'), ['...XT(!h&&v,{label:c.formatMessage({defaultMessage:"Keep computer awake",id:"CapHOIPauL"}),description:c.formatMessage({defaultMessage:"Only for this session",id:"SWSZIzLoC3"}),checked:v?.on??!1,checkedRole:"checkbox",keepOpen:!0']);
  // Main process: supported unless the workspace turns keep-awake off, GrowthBook 1781903805 defaulting on.
  const main = officialMain('index.chunk-muI2IV6k.js');
  pin(main, ['codeSessionKeepAwake:GU()?fW:{status:"unavailable"}', 'function GU(){return NU()&&gy(Uvr,!0)}', 'Uvr="1781903805"',
    'function NU(){return K().workspace?.keepAwakeEnabled!==!1}', 'function gy(e,t){let n=Zv[e];return py(e,n),n?.on??t}', 'fW={status:"supported"}']);
});

test('topbar-08 local: View options shows the row for any unarchived session (all local: none shared, cloud or cli)', () => {
  const main = local('src/main.jsx');
  const titlebarMenu = main.slice(main.indexOf('case "titlebar":'), main.indexOf('case "session-title":'));
  assert.match(titlebarMenu, /\{!sessionArchived\(menu\.data\) && <>\n\s+<SourceMenu\.Separator \/>\n\s+<SessionKeepAwakeItem session=\{menu\.data\} metadata=\{sessionMetadata\[menu\.data\.id\]\}/);
  assert.match(main, /case "keep-awake": return updateSessionMetadata\(target\.id, \{ keepAwake: payload\?\.value === true \}\);/);
  // The ⋮ trigger exists only with a session, so menu.data is always one.
  assert.match(local('src/source-titlebar.jsx'), /\{surface === "code" && session && <ToolButton\n\s+label=\{viewOptionsLabel\(foldedActivity\)\}/);
  const sidebar = local('src/source-sidebar.jsx');
  assert.match(sidebar, /<SourceMenu\.Item keepOpen role="menuitemcheckbox" aria-checked=\{metadata\.keepAwake === true\} description=\{t\("Only for this session"\)\}/);
  assert.match(sidebar, /trailing=\{<SourceSwitch decorative size="xs" checked=\{metadata\.keepAwake === true\} \/>\}/);
  // KU's !s.isArchived, over both spellings a local record uses.
  assert.equal(sessionArchived({ id: 's', archived: true }), true);
  assert.equal(sessionArchived({ id: 's', isArchived: true }), true);
  assert.equal(sessionArchived({ id: 's' }), false);
});

// ---------------------------------------------------------------------------------------------------------------
// topbar-09 the ghost toggle's pressedVariant "selected" (fizzy-lake color), off by default.
test('topbar-09 official: "selected" needs fizzy-lake color, whose allow-list is empty, so a pressed ghost toggle paints gc (bg-accent) under aria-pressed:text-accent', () => {
  const frame = official('shared-frame-BfjMqbuN.js');
  pin(frame, [
    'ce=gr(),le=h==="selected",ue=le&&F==="ghost"&&S===void 0&&_r(ce,"color"),de=le&&S===void 0,fe=de&&F==="secondary",pe=ue?Nc:fe?Pc:F==="secondary"||F==="ghost"?Mc:de&&F==="danger"?Fc:ne?Ic:""',
    'function _r(e,t){return e?.split(" ").includes(t)??!1}',
    'var hr=G(void 0);function gr(){return W(hr)}',
    'k=xr(W(hr),l?.fizzyLake?.parts)',
    '${ue?_c:gc}',
    // The Button root is the group/btn those paint classes key on.
    'Il=g("cds-reset group/btn relative isolate inline-flex',
    ',gc="group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent",_c="group-aria-pressed/btn:bg-fill-ghost-selected',
    'ghost:`text-primary font-normal font-control aria-pressed:text-accent ${dc}`',
    '...ue?{"data-cds-pressed-variant":h}:void 0',
    '"aria-pressed":S===void 0?p:void 0',
  ]);
  const flags = official('shared-4-CJsHhp5n.js');
  pin(flags, ['xf="spa:fizzy-lake",Sf="data-cds-fizzy-lake",Cf=[]',
    'var Ef=Cf,Df;function Of(){return Df??={parts:typeof document>"u"?[]:wf(document.documentElement.getAttribute(Sf),Ef)},Df}',
    'function wf(e,t){let n=new Set(e?.split(" "));return t.filter(e=>n.has(e)).sort()}', 'Of as uo']);
  const roots = official('shared-23-Bu_lvvVo.js');
  pin(roots, ['fizzyLake:T_()'], 2);
  pin(roots, ['uo as T_']);
  // The titlebar's ghost toggles that ask for it: lW (pane toggles, className rm("text-secondary")) and the rail toggle.
  const session = official('cc43287c9-DAfOi8yP.js');
  pin(session, ['pressedVariant:"selected"'], 2);
  pin(session, ['i=rm("text-secondary")', 'className:i,pressed:e.active,pressedVariant:"selected"',
    'variant:"ghost",iconOnly:!0,icon:Hh(an),className:o,pressed:e.onScreen,pressedVariant:"selected"']);
});

test('topbar-09 local: no selected variant (as default), and the pressed toggle paints bg-accent under text-accent — aligned (R4f-rail SR-6)', () => {
  const html = renderTitlebar({ terminalAvailable: true, panes: new Set(['terminal']) });
  const toggle = html.match(/<button[^>]*data-pane-toggle="terminal"[^>]*>/)[0];
  assert.match(toggle, /aria-pressed="true"/);
  assert.match(toggle, /class="code-icon-button text-secondary is-selected"/);
  // Same as the default-off branch: no data-cds-pressed-variant and no ghost-selected fill.
  assert.doesNotMatch(html, /data-cds-pressed-variant|bg-fill-ghost-selected/);
  assert.equal(titlebarControlClass(true), 'code-icon-button text-secondary is-selected');
  assert.match(html, /<div class="st-trailing panel-toggles">/);
  // ALIGNED: the official default path is gc + Il ghost, bg-accent behind text-accent, hovered or not. ToolButton has no
  // paint layer, so source-titlebar.css puts those two utilities' declarations on the pressed button itself, above the
  // legacy alpha-1 wash and the local hover (tests/titlebar-rail-toggle.test.mjs resolves it through the real cascade).
  const css = local('src/source-titlebar.css');
  const rule = css.match(/\.st-toolbar \.code-icon-button\.text-secondary\[aria-pressed="true"\],\n\.st-toolbar \.code-icon-button\.text-secondary\[aria-pressed="true"\]:hover:not\(:disabled\) \{([^}]*)\}/);
  assert.ok(rule, 'the pressed rule, hover included');
  assert.match(rule[1], /background-color: var\(--cds-bg-accent\);/);
  assert.match(rule[1], /color: var\(--cds-text-accent\);/);
  // The same values as the loaded official utilities that gc and Il name.
  const sheet = local('public/assets/v1/c6a992d55-sXiDGMFQ.css');
  pin(sheet, ['.group-aria-pressed\\/btn\\:bg-accent:is(:where(.group\\/btn)[aria-pressed=true] :where(.group-aria-pressed\\/btn\\:bg-accent)){background-color:var(--cds-bg-accent)}',
    '.aria-pressed\\:text-accent[aria-pressed=true]{color:var(--cds-text-accent)}']);
  // The popout Keep window on top (DW: ghost, pressed: t, no pressedVariant) takes the same default pressed look.
  const pinned = renderTitlebar({ popoutWindow: { alwaysOnTop: true, onDock() {}, onTogglePin() {} } });
  assert.match(pinned.match(/<button[^>]*data-popout-pin=""[^>]*>/)[0], /class="code-icon-button text-secondary is-selected"[^>]*aria-pressed="true"/);
  pin(official('cc43287c9-DAfOi8yP.js'), ['v(fd,{variant:"ghost",iconOnly:!0,icon:Hh(t?"PinFilled":"Pin"),className:a,pressed:t,onClick:n,"aria-label":r})']);
});

// ---------------------------------------------------------------------------------------------------------------
// topbar-12 the pane title falls back to a localized "Untitled".
test('topbar-12 official: the session pane title falls back to formatMessage "Untitled" (3kbIhS7KZS)', () => {
  pin(official('cc43287c9-DAfOi8yP.js'), [
    'se.formatMessage({defaultMessage:"Untitled",id:"3kbIhS7KZS"})',
    'title:je??ue??ye??se.formatMessage({defaultMessage:"Untitled",id:"3kbIhS7KZS"})',
  ]);
});

test('topbar-12 local: an unnamed session renders t("Untitled"), 未命名 in zh-CN', () => {
  assert.match(local('src/source-titlebar.jsx'), /const title = session\?\.name \|\| session\?\.preview \|\| t\("Untitled"\);/);
  assert.equal(dictionary('zh-CN').Untitled, '未命名');
  const titleButton = (html) => html.match(/<button[^>]*class="session-title st-title"[^>]*>([^<]*)<\/button>/);
  const en = titleButton(renderTitlebar({ session: { id: 'u', cwd: '/tmp/work' } }));
  assert.equal(en[1], 'Untitled');
  assert.match(en[0], /aria-label="Untitled, rename session"/);
  const zh = inLocale('zh-CN', () => titleButton(renderTitlebar({ session: { id: 'u', cwd: '/tmp/work' } })));
  assert.equal(zh[1], '未命名');
  assert.match(zh[0], /aria-label="未命名，重命名会话"/);
  // A named session keeps its own title.
  assert.equal(titleButton(renderTitlebar())[1], 'A title');
});

// ---------------------------------------------------------------------------------------------------------------
// tasks-07 Plan pane: Open in gets line (and remote); Copy plan writes through the button's own window.
test('tasks-07 official: Open in needs a local plan path (line 1 for a local session), Copy plan copies via the button\'s window', () => {
  const plan = official('cccc2cf0a-B0D--VZp.js');
  pin(plan, [
    'l=e.type==="local"&&s?i??void 0:void 0',
    'line:qf(s?.remote,!1),remote:s?.remote',
    'v=f.length>0||p.length>0;return r?d(c,{children:[v&&g(Rv,{header:u,editorItems:f,extraItems:_}),',
    '"aria-label":a?n.formatMessage({defaultMessage:"Copied",id:"p556q3uvbn"}):n.formatMessage({defaultMessage:"Copy plan",id:"2N3JuXYdJ1"}),onMouseDown:ep,onClick:e=>void o(r,e.currentTarget)',
  ]);
  assert.match(plan, /import\{[^}]*\bZr as ve\b[^}]*\}from"\.\/shared-1-CAAiD7E3\.js"/);
  assert.match(plan, /import\{[^}]*\bW as jf\b[^}]*\bw as qf\b[^}]*\}from"\.\/c856385e2-DVsjb2QL\.js"|import\{[^}]*\bw as qf\b[^}]*\bW as jf\b[^}]*\}from"\.\/c856385e2-DVsjb2QL\.js"/);
  const openIn = official('c856385e2-DVsjb2QL.js');
  pin(openIn, ['function sn(e,t){return e!==void 0&&!t?1:void 0}', 'sn as w', 'dn as W',
    // No path: no editor rows, no Default app, no reveal row, so zv renders no Open in menu.
    'a=c&&t?e.map(e=>({label:e.name,onSelect:()=>{y(e.type),v(c,e,n)}})):[]', 'E=[];return c&&r?.kind!=="ssh"&&i&&x&&E.push(']);
  pin(official('shared-1-CAAiD7E3.js'), ['MP as Zr', 'function MP(e={}){let{timeout:t=2e3,trim:n=!0}=e',
    'async function NP(e,t,n){let r=(n?.ownerDocument?.defaultView??globalThis).navigator?.clipboard;if(!r)return!1;']);
});

test('tasks-07 local: no plan path, so no Open in; Copy plan writes navigator.clipboard of its own window (each popout is its own renderer)', async () => {
  // The local plan document is the plan item's text: there is no path for Open in to use.
  assert.match(local('src/state.js'), /return \{ \.\.\.planDocs, \[id\]: item\.text \};/);
  assert.match(local('src/source-session.jsx'), /: tab === "plan" && planDocument \? <SourcePlanCopyButton document=\{planDocument\} \/>/);
  const pane = local('src/source-plan-pane.jsx');
  assert.doesNotMatch(pane, /t\(["']Open in["']\)/);
  assert.match(pane, /writeText: \(value\) => typeof navigator !== "undefined" && navigator\.clipboard\?\.writeText\n\s+\? navigator\.clipboard\.writeText\(value\)/);
  // The Plan popout is a BrowserWindow of its own (PopoutApp), so `navigator` is the button's window.
  const electronMain = local('electron/main.cjs');
  assert.match(electronMain, /const POPOUT_KINDS = new Set\(\["files", "changes", "plan", "tasks", "terminal", "side-chat", "session"\]\);/);
  assert.match(local('src/main.jsx'), /\? <PopoutApp sessionId=\{popoutSession\} pane=\{popoutQuery\.get\("pane"\)\}/);
  const button = renderToStaticMarkup(h(P.SourcePlanCopyButton, { document: 'Plan' }));
  assert.match(button, /<button type="button" class="source-icon-button spc-ghost" aria-label="Copy plan" data-plan-copy="">/);
  assert.doesNotMatch(button, /Open in/);
  // The copy itself: the document text goes to the injected writeText, then Copied, then back to idle.
  // Outside this item (not asserted as equal): official MP() trims the text and keeps "Copied" 2000ms; the local
  // feedback copies the document as is and resets after its default 1200ms.
  const writes = [], states = [], timers = [];
  const feedback = createClipboardFeedback({ writeText: async (value) => { writes.push(value); }, onState: (state) => states.push(state),
    schedule: (run, ms) => { timers.push({ run, ms }); return timers.length; }, cancel() {} });
  feedback.setText('Plan');
  assert.equal(await feedback.copy(), true);
  assert.deepEqual(writes, ['Plan']);
  assert.deepEqual(states, ['idle', 'pending', 'copied']);
  timers[0].run();
  assert.equal(states.at(-1), 'idle');
});
