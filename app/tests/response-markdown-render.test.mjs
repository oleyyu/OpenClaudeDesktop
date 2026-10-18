import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Node-only rendering of the actual application components. Middleware mode
// does not launch/listen to a browser or Electron and does not call Codex.
let server, SourceCodeFontSetting, SourceSegments, SourceSelect, SourceSkillFile, SkillSource, DeveloperServers, SourceTranscriptStatus, PluginDetail, SourceMessage, SourceDiff, SourceHighlightedLine, SourceCustomize, SourceTaskOutput, CommandOutput, SettingsSearchResults, SourceToolGroup, toolGroupExpansion, groupExpansionKey, toolRowExpansion, rowExpansionKey;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceCodeFontSetting } = await server.ssrLoadModule('/src/source-code-font-setting.jsx'));
  ({ SourceSegments } = await server.ssrLoadModule('/src/source-segments.jsx'));
  ({ SourceSelect } = await server.ssrLoadModule('/src/source-select.jsx'));
  ({ SourceSkillFile, SkillSource } = await server.ssrLoadModule('/src/source-skill-file.jsx'));
  ({ SourceMessage } = await server.ssrLoadModule('/src/source-session.jsx'));
  ({ SourceTranscriptStatus } = await server.ssrLoadModule('/src/source-transcript-status.jsx'));
  ({ DeveloperServers } = await server.ssrLoadModule('/src/source-settings-pages.jsx'));
  ({ SourceDiff } = await server.ssrLoadModule('/src/source-diff.jsx'));
  ({ SourceHighlightedLine } = await server.ssrLoadModule('/src/source-diff-code.jsx'));
  ({ SourceCustomize, PluginDetail } = await server.ssrLoadModule('/src/source-customize.jsx'));
  ({ SourceTaskOutput } = await server.ssrLoadModule('/src/source-background-tasks.jsx'));
  ({ CommandOutput } = await server.ssrLoadModule('/src/source-command.jsx'));
  ({ SettingsSearchResults } = await server.ssrLoadModule('/src/source-settings-search.jsx'));
  ({ SourceToolGroup } = await server.ssrLoadModule('/src/source-tool-group.jsx'));
  ({ toolGroupExpansion, groupExpansionKey, toolRowExpansion, rowExpansionKey } = await server.ssrLoadModule('/src/tool-group-expansion.mjs'));
});

test('actual transcript and background command output share ANSI colors and never create HTML or OSC links', () => {
  const text = '\x1b[31;1mred\x1b[0m <script>x</script> \x1b]8;;https://example.test\x07link\x1b]8;;\x07';
  const task = { id: 'cmd', description: 'test', command: 'printf "<img>"', output: text, status: 'running' };
  const background = renderToStaticMarkup(React.createElement(SourceTaskOutput, { task, sessionId: 'test-session' }));
  const transcript = renderToStaticMarkup(React.createElement(CommandOutput, { text }));
  for (const html of [background, transcript]) {
    assert.match(html, /color:#c82829/); assert.match(html, /font-weight:bold/);
    assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|<a |https:\/\/example|\x1b/);
  }
  assert.match(background, /role="region" tabindex="0" aria-label="Command for test"/);
  assert.match(background, /class="src-cmd-prompt">\$ <\/span>/);
  assert.match(background, /printf &quot;&lt;img&gt;&quot;/);
  assert.match(background, /aria-label="Output for test"/);
  assert.doesNotMatch(background, /aria-label="Copy"/);
});
test('background output applies the real 8000-character tail before painting and falls back without repeating description', () => {
  const task = { id: 'cmd', description: 'test', output: 'discard-me'+ '\x1b[32m' + 'x'.repeat(8000), status: 'running' };
  const html = renderToStaticMarkup(React.createElement(SourceTaskOutput, { task, sessionId: 'test-session' }));
  // B21: lC/sC (cccc2cf0a :11074-11128) label the 8000-character tail "(Earlier output not shown)".
  assert.match(html, /\(Earlier output not shown\)/); assert.doesNotMatch(html, /discard-me|color:/);
  const empty = renderToStaticMarkup(React.createElement(SourceTaskOutput, { task: { ...task, output: '', summary: 'test' }, sessionId: 'test-session' }));
  assert.match(empty, /No output yet/);
});

test('actual Customize pages keep header outside the scrolling list body without invented catalog entries', () => {
  const snapshot = { skills: { skills: [], errors: [], status: 'ready' }, plugins: { rows: [], status: 'ready' }, mcp: { rows: [], status: 'ready' } };
  const store = { getSnapshot: () => snapshot, subscribe: () => () => {} };
  for (const page of ['skills', 'connectors', 'plugins']) {
    const html = renderToStaticMarkup(React.createElement(SourceCustomize, { section: `customize-${page}`, store, cwd: '/fixture', call() { throw Error('SSR may not call the backend'); } }));
    assert.match(html, new RegExp(`data-cz-page="${page}"`));
    assert.match(html, /<header class="cz-header">/);
    assert.match(html, /<\/header><div class="cz-page-body scroll-fade-y scroll-fade-size-6">/);
    assert.equal((html.match(/class="cz-header"/g) || []).length, 1);
    assert.doesNotMatch(html, /data-row-id=/);
    assert.match(html, /aria-expanded="false"/);
  }
});
after(async () => { await server?.close(); });
const render = (text, extra = {}) => renderToStaticMarkup(React.createElement(SourceMessage, {
  item: { id: 'render-fixture', type: 'agentMessage', text }, sessionKey: 'render-session', cwd: '/fixture',
  onOpenFileRef() { throw new Error('Rendering is not file activation'); }, ...extra,
}));

test('response keyboards follow the source exact tags, raw body, UTF16 limit and safe literal fallback', () => {
  const html = render('Press <KbD>⌘K</kBd>, <kbd>&amp; **raw** `x` <img src=x></kbd> and <kbd></kbd>.');
  assert.match(html, /<kbd>⌘K<\/kbd>/);
  assert.match(html, /<kbd>&amp;amp; \*\*raw\*\* `x` &lt;img src=x&gt;<\/kbd>/);
  assert.match(html, /<kbd><\/kbd>/); assert.doesNotMatch(html, /<img |<strong>|<code>/);
  for (const body of ['x'.repeat(64), '😀'.repeat(32)]) assert.match(render(`<kbd>${body}</kbd>`), /<kbd>/);
  for (const body of ['x'.repeat(65), '😀'.repeat(33)]) assert.doesNotMatch(render(`<kbd>${body}</kbd>`), /<kbd>/);
  const invalid = render('Escaped \\<kbd>x</kbd>; <kbd class=x>y</kbd>; <kbd >z</kbd>; &lt;kbd&gt;a&lt;/kbd&gt;.');
  assert.doesNotMatch(invalid, /<kbd[ >]/); assert.match(invalid, /&lt;kbd class=x&gt;/);
});

test('response keyboards stay opaque inside containers and image alt, including multi-line paragraph openings', () => {
  const html = render('<kbd>\n⌘K\n</kbd>\n\n> <kbd>\n> ⌘P\n> </kbd>\n\n- **<kbd>⌘S</kbd>**\n\n![<kbd>Keyboard</kbd>](https://example.test/image.png)\n\n`<kbd>raw</kbd>`\n\n```text\n<kbd>fenced</kbd>\n```');
  assert.match(html, /<p><kbd>\n⌘K\n<\/kbd><\/p>/);
  assert.match(html, /<blockquote>\n<p><kbd>\n⌘P\n<\/kbd><\/p>/);
  assert.match(html, /<strong><kbd>⌘S<\/kbd><\/strong>/);
  assert.match(html, /Keyboard/); assert.equal((html.match(/<kbd>/g)||[]).length, 3);
  // F06: inline code carries data-epitaxy-inline-code for the transcript context menu (markdown-current.js:4236-4252 Pc).
  assert.match(html, /<code data-epitaxy-inline-code="">&lt;kbd&gt;raw&lt;\/kbd&gt;<\/code>/);
  assert.doesNotMatch(render('<div>\n<script>alert(1)</script>\n</div>'), /<div>\n<script>|<script>/);
});

test('response inline code preserves source newlines and trims only one ASCII space pair when closed', () => {
  const html = render('`\nalpha\n` and ` alpha ` and `  alpha  ` and `   ` and ``a`b`` and `&amp; \\*`\n\n> `first\n> second`\n\n| Value |\n| --- |\n| `a\\|b` |');
  for (const value of ['\nalpha\n', 'alpha', ' alpha ', '   ', 'a`b', '&amp;amp; \\*', 'first\nsecond', 'a|b']) assert.ok(html.includes(`<code data-epitaxy-inline-code="">${value}</code>`), value);
  assert.match(render('Before ` first\nsecond', {isStreaming:true}), /<code data-incomplete="" data-epitaxy-inline-code=""> first\nsecond<\/code>/);
  assert.match(render('Before ` first\nsecond `', {isStreaming:true}), /<code data-epitaxy-inline-code="">first\nsecond<\/code>/);
  assert.match(render('`\r\nalpha\r\n`'), /<code data-epitaxy-inline-code="">\nalpha\n<\/code>/);
});

test('actual response component links path chips, including missing files, but never code fences or nested links', () => {
  const html = render('See `src/app.ts:3-5` and `src/missing.ts`.\n\n[`src/linked.ts`](https://example.test)\n\n```text\nsrc/block.ts\n```\n\n`/net/remote/file.ts`');
  assert.equal((html.match(/data-file-ref=/g) || []).length, 2);
  assert.match(html, /data-file-ref="src\/app.ts" data-file-line="3"/);
  assert.match(html, /data-file-ref="src\/missing.ts"/);
  assert.doesNotMatch(html, /data-file-ref="(?:src\/linked.ts|src\/block.ts|\/net\/remote\/file.ts)"/);
  assert.match(html, /href="https:\/\/example.test"/);
  assert.equal((render('`src/app.ts`', { onOpenFileRef: null }).match(/role="button"/g) || []).length, 0);
});

test('actual response Markdown preserves file URLs and routes file labels to one safe pane control', () => {
  const html = render('[Open file](file:///tmp/My%20File.ts#L7-L3) and [README](README) and [`src/app.ts`](src/app.ts:2-4).');
  assert.match(html, /data-file-ref="\/tmp\/My File.ts" data-file-line="3" data-file-end-line="7"/);
  assert.match(html, /data-file-ref="README"/);
  assert.match(html, /data-file-ref="src\/app.ts" data-file-line="2" data-file-end-line="4"/);
  assert.equal((html.match(/role="button"/g) || []).length, 3);
  assert.match(html, /<code>src\/app.ts:2-4<\/code>/);
  assert.doesNotMatch(html, /href="file:/);
  const inert = render('[Open file](file:///net/share/x.ts) and [missing](missing.ts)', { onOpenFileRef: null });
  assert.doesNotMatch(inert, /role="button"|<a /);
  // markdown-current bl delegates to vendor-markdown oo for non-file URLs:
  // a colon before a slash is a scheme, not an allowed relative line marker.
  assert.doesNotMatch(render('[Bare path](app.ts:1)'), /role="button"|<a /);
  assert.match(render('[Relative path](./app.ts:1)'), /data-file-ref="\.\/app.ts" data-file-line="1"/);
});
test('actual response URLs retain safe external attributes and unsupported schemes never become clickable', () => {
  const url = 'https://example.test/' + 'a/'.repeat(120) + 'file.ts';
  const html = render(`[${url}](${url}) and [**docs**](https://example.test/docs)\n\n[x](javascript:alert%281%29) [email](mailto:a@b.test) [remote](file://host/a.ts)`);
  assert.equal((html.match(/target="_blank" rel="noreferrer"/g) || []).length, 2);
  assert.match(html, /title="https:\/\/example.test\//);
  assert.match(html, /…\/file.ts/);
  assert.match(html, /<strong>docs<\/strong>/);
  assert.doesNotMatch(html, /href="(?:javascript:|mailto:|file:)/);
});
// R08: markdown-current.js:4358-4365/:4543-4555 + rc :3713-3786 inside transcriptLinks (SourceForgeRepoContext).
test('GitHub refs: a bare PR URL in transcript text is the forge chip; a descriptive label stays a plain link', async () => {
  const { SourceForgeRepoContext } = await server.ssrLoadModule('/src/source-forge-ref.jsx');
  const inTranscript = (text, slug = '') => renderToStaticMarkup(React.createElement(SourceForgeRepoContext.Provider, { value: slug },
    React.createElement(SourceMessage, { item: { id: 'forge-fixture', type: 'agentMessage', text }, sessionKey: 'forge-session', cwd: '/fixture' })));
  const pr = 'https://github.com/acme/widgets/pull/42';
  const chip = inTranscript(`See ${pr} now.`);
  assert.match(chip, new RegExp('<a href="https://github.com/acme/widgets/pull/42" target="_blank" rel="noreferrer" class="hide-focus-ring smd-forge-ref" data-forge-kind="pull">'
    + '<span class="whitespace-nowrap"><span class="relative bottom-\\[calc\\(\\(1cap-1ex\\)/2\\)\\] me-1 inline-flex align-middle">'
    + '<span aria-hidden="true" data-cds="Icon" class="" style="font-size:12px;font-weight:[\\d.]+">[^<]+</span></span>acme/widgets#42</span></a>'));
  assert.doesNotMatch(chip, /aria-label=|title=/);
  // The session's own repo shortens to #N; an issue has no glyph; deep links add the source suffix.
  assert.match(inTranscript(`<${pr}>`, 'acme/widgets'), />#42<\/span><\/a>/);
  const issue = inTranscript('[#7](https://github.com/acme/widgets/issues/7)');
  assert.match(issue, /data-forge-kind="issues"><span class="whitespace-nowrap">acme\/widgets#7<\/span><\/a>/);
  assert.doesNotMatch(issue, /data-cds="Icon"/);
  assert.match(inTranscript(`[acme/widgets#42](${pr}/files)`, 'acme/widgets'), />#42 \(files\)<\/span>/);
  assert.match(inTranscript(`${pr}#pullrequestreview-9`), />acme\/widgets#42 \(review\)<\/span>/);
  // A descriptive label, another number or an image child keeps the plain link.
  for (const text of [`[the widget fix](${pr})`, `[#41](${pr})`, `[![shot](https://example.test/a.png)](${pr})`]) {
    const html = inTranscript(text);
    assert.doesNotMatch(html, /smd-forge-ref|GitPullRequest/, text);
    assert.match(html, /<a href="https:\/\/github.com\/acme\/widgets\/pull\/42" target="_blank" rel="noreferrer">/, text);
  }
  // Ports, credentials and non-GitHub hosts stay plain; outside the transcript every link stays plain.
  for (const url of ['https://github.com:8443/acme/widgets/pull/42', 'https://gitlab.com/acme/widgets/pull/42']) assert.doesNotMatch(inTranscript(url), /smd-forge-ref/, url);
  assert.doesNotMatch(render(`See ${pr} now.`), /smd-forge-ref/);
});
test('response table renders original cells safely; a streaming table keeps the content layout (cov1-06)', () => {
  const text = '## Results\n\n| File | Value |\n| --- | --- |\n| `src/table.ts` | <script>alert(1)</script> |';
  const settled = render(text), streaming = render(text, { isStreaming: true });
  assert.match(settled, /class="source-table-scroll"/);
  assert.match(settled, /<th>File<\/th>/);
  assert.match(settled, /data-file-ref="src\/table.ts"/);
  assert.doesNotMatch(settled, /<script>/);
  assert.match(settled, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  // R3b-transcript cov1-06: the original freeze (c89efce1a jc, tests/r3b-transcript-current.test.mjs) measures and
  // pins header min-widths in a layout effect instead of fixing the table layout, so neither render carries a layout
  // style and the server render pins nothing.
  assert.doesNotMatch(settled, /table-layout:fixed/);
  assert.doesNotMatch(streaming, /table-layout:fixed|min-width/);
  assert.match(streaming, /<table><thead><tr><th>/);
  // Server rendering cannot measure widths: never invent overflow/Expand.
  assert.doesNotMatch(settled, /aria-label="Expand table"/);
});

test('actual Changes renderer shows one real unified number and preserves old/new coordinates and safe text', () => {
  const value = '--- a/app.ts\n+++ b/app.ts\n@@ -4,2 +4,3 @@\n keep();\n-old();\n+next();\n+<script>unsafe()</script>\n';
  const html = renderToStaticMarkup(React.createElement(SourceDiff, { value, scopeKey: 'fixture-session' }));
  const numbers = [...html.matchAll(/class="sdiff-line-number" aria-hidden="true">(\d+)<\/div>/g)].map(match => Number(match[1]));
  assert.deepEqual(numbers, [4, 5, 5, 6]);
  assert.match(html, /data-kind="context" data-old-line="4" data-new-line="4"/);
  assert.match(html, /data-kind="removed" data-old-line="5"/);
  assert.match(html, /data-kind="added" data-new-line="6"/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);assert.doesNotMatch(html, /<script>/);
  assert.equal((html.match(/sdiff-code-cell/g)||[]).length, 4);
  assert.doesNotMatch(html, /data-highlighted=|data-word-diff=/); // SSR never claims worker completion.
});
test('Changes empty hunks and malformed patches render without inventing code or crashing the shared highlighter', () => {
  const empty = renderToStaticMarkup(React.createElement(SourceDiff, { value: '--- a/empty.ts\n+++ b/empty.ts\n@@ -0,0 +0,0 @@\n' }));
  assert.doesNotMatch(empty, /class="sdiff-row /);
  const bad = renderToStaticMarkup(React.createElement(SourceDiff, { value: '--- a/bad.ts\n+++ b/bad.ts\n@@ -1,2 +1,2 @@\n-x\n+y\n' }));
  assert.match(bad, /Incomplete or truncated hunk/); assert.doesNotMatch(bad, /sdiff-line-number/);assert.match(bad, /-x/);assert.match(bad, /\+y/);
});
test('shared actual line renderer wraps one word range across multiple syntax tokens without disturbing safe text', () => {
  const light = { color: '#123456', fontStyle: 0 }, dark = { color: '#abcdef', fontStyle: 0 };
  const html = renderToStaticMarkup(React.createElement(SourceHighlightedLine, {
    tokens: [{ text: 'const ', light, dark }, { text: 'value', light, dark }, { text: ' <img>' }], ranges: [[3, 8]],
  }));
  assert.equal((html.match(/data-diff-span=/g)||[]).length, 1);
  assert.equal((html.match(/data-code-token=/g)||[]).length, 4);
  assert.match(html, /&lt;img&gt;/);assert.doesNotMatch(html, /<img>/);
  assert.match(html, /--sch-light:#123456/);assert.match(html, /--sch-dark:#abcdef/);
});

test('actual split Changes renderer pairs real lines and keeps missing sides empty', () => {
  const value = '--- a/app.ts\n+++ b/app.ts\n@@ -4,2 +4,3 @@\n keep();\n-old();\n+next();\n+<script>unsafe()</script>\n';
  const html = renderToStaticMarkup(React.createElement(SourceDiff, { value, layout: 'split', wordWrap: false }));
  assert.match(html, /data-layout="split" data-word-wrap="false"/);
  assert.equal((html.match(/class="sdiff-split-row"/g) || []).length, 3);
  assert.deepEqual([...html.matchAll(/class="sdiff-line-number" aria-hidden="true">(\d+)<\/div>/g)].map(match => Number(match[1])), [4, 4, 5, 5, 6]);
  assert.match(html, /class="sdiff-split-side sdiff-split-empty" aria-hidden="true"><\/div>/);
  assert.match(html, /data-side="before" data-old-line="5"/);
  assert.match(html, /data-side="after" data-new-line="6"/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
});

// Render the real shared result component in Node, never a screenshot/browser.
test('settings search renders section, child, accurate more label and safe accent spans', () => {
 const html=renderToStaticMarkup(React.createElement(SettingsSearchResults,{query:'Code',active:1,onSelect(){},onActive(){},results:[
  {kind:'hit',key:'parent',section:'Code',label:'Code',icon:'Code',via:'Code font'},
  {kind:'child',key:'child',section:'Code',label:'Code <script>unsafe</script>',id:'font'},
  {kind:'more',key:'more',section:'Code',label:'Code',count:4},
 ]}));
 assert.equal((html.match(/ss-search-match/g)||[]).length,3);assert.match(html,/aria-label="4 more matches in Code"/);assert.match(html,/\+4 more/);assert.match(html,/data-kind="child" data-highlighted=""/);assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
 const empty=renderToStaticMarkup(React.createElement(SettingsSearchResults,{results:[],query:'nothing',active:0}));assert.match(empty,/ss-search-empty/);assert.match(empty,/No matching settings/);assert.doesNotMatch(empty,/<button/);
});

test('actual tool group renders only failed verbs in danger and restores per-session expansion without leaking content', () => {
 const tools=[{id:'first',type:'commandExecution',status:'failed',command:'false'},{id:'second',type:'commandExecution',status:'failed',command:'false'}];
 const props={item:{id:'first',toolGroup:tools},renderItem:item=>React.createElement('span',null,'output:'+item.id),sessionKey:'one',pendingApprovalItemIds:new Set()};
 const renderGroup=extra=>renderToStaticMarkup(React.createElement(SourceToolGroup,{...props,...extra}));
 toolGroupExpansion.clear();
 try {
  // Npe classic:53858–54010 uses a native type=button, with gap4 summary/count wrapper.
  const collapsed=renderGroup();assert.match(collapsed,/<button type="button" class="stg-trigger"/);assert.match(collapsed,/<span class="stg-morph stg-label">/);assert.match(collapsed,/aria-expanded="false"/);assert.doesNotMatch(collapsed,/stg-list|output:first/);assert.match(collapsed,/aria-label="Ran 2 commands \(2 failed\)"/);assert.match(collapsed,/<span data-summary-error="true">Ran<\/span> 2 commands/);
  toolGroupExpansion.set(groupExpansionKey('one','first'),true);
  const reopened=renderGroup();assert.match(reopened,/aria-expanded="true"/);assert.match(reopened,/output:first/);assert.match(reopened,/output:second/);
  assert.doesNotMatch(renderGroup({sessionKey:'two'}),/stg-list/);
  // Sk:16616–16702 supplies basename metadata; classic renders it as text (file link belongs to modern branch).
  const sameFile=renderGroup({sessionKey:'two',item:{id:'read',toolGroup:[{id:'read',type:'commandExecution',status:'completed',commandActions:[{type:'read',path:'/fixture/app.ts'}]},{id:'edit',type:'fileChange',status:'completed',changes:[{kind:'update',path:'/fixture/app.ts',diff:'@@ -1 +1 @@\n-before\n+after'}]}]}});
  assert.match(sameFile,/Read and edited<\/span> app\.ts/);assert.doesNotMatch(sameFile,/sft-path|role="link"|<a /);
  toolGroupExpansion.set(groupExpansionKey('one','first'),false);assert.match(renderGroup({transcriptView:'verbose'}),/aria-expanded="true"/);assert.match(renderGroup({transcriptView:'normal'}),/aria-expanded="false"/);
 } finally {toolGroupExpansion.clear();}
});

test('real Customize search destinations render exact skill, plugin-owned skill, and seeded lists without fabricated files',()=>{
 const skills=[{id:'a',name:'Alpha <script>',skillName:'alpha',path:'/alpha/SKILL.md',scope:'user',enabled:false},
 {id:'b',name:'Beta',skillName:'beta',path:'/beta/SKILL.md',scope:'user',enabled:true},
 {id:'p',name:'Plugin Audit',skillName:'audit',path:'/audit/SKILL.md',scope:'user',enabled:true,pluginId:'plugin'}];
 const snapshot={skills:{status:'ready',cwd:'/fixture',skills,errors:[]},plugins:{status:'ready',cwd:'/fixture',rows:[{id:'plugin',name:'Real Package',skillCount:1,enabled:true}]},mcp:{status:'ready',cwd:'/fixture',rows:[]}};
 const store={getSnapshot:()=>snapshot,subscribe:()=>()=>{}};
 const page=(section,focus)=>renderToStaticMarkup(React.createElement(SourceCustomize,{section:`customize-${section}`,focus,store,cwd:'/fixture',call(){throw Error('Rendering may not read or write the backend');}}));
 const standalone=page('skills',{skillPath:'/alpha/SKILL.md'});
 // F13: c9a7e510b D titles the skill with an h2 font-large-bold; the file loads behind the p-3 skeleton.
 assert.match(standalone,/<h2 class="min-w-0 font-large-bold text-primary truncate">Alpha &lt;script&gt;<\/h2>/);assert.match(standalone,/aria-checked="false"/);
 assert.match(standalone,/data-cz-file-loading=""/);assert.doesNotMatch(standalone,/data-skill-file=|<script>|<table/);
 const plugin=page('plugins',{pluginId:'plugin',skillPath:'/audit/SKILL.md'});
 // 0.2.107: the drill back is the CDS Button (page shell :486-493), whose label sits in .ssb-content.
 assert.match(plugin,/<h2 class="min-w-0 font-large-bold text-primary truncate">Plugin Audit<\/h2>/);assert.match(plugin,/Real Package<\/span><\/button>/);
 assert.match(plugin,/data-cz-file-loading=""/);assert.doesNotMatch(plugin,/<table/);
 const seeded=page('skills',{searchSeed:'Beta'});
 assert.match(seeded,/aria-label="Search skills"[^>]*value="Beta"/);
 assert.match(seeded,/data-row-id="b"/);assert.doesNotMatch(seeded,/data-row-id="a"|data-row-id="p"/);
 snapshot.skills.cwd='/other';
 assert.doesNotMatch(page('plugins',{pluginId:'plugin',skillPath:'/audit/SKILL.md'}),/data-cz-detail="skill"/);
 assert.doesNotMatch(page('skills',{skillPath:'/alpha/SKILL.md'}),/data-cz-detail="skill"|data-row-id="a"/);
 snapshot.plugins.cwd='/other';
 assert.doesNotMatch(page('plugins',{pluginId:'plugin'}),/aria-label="Real Package"|data-plugin-id="plugin"/);
});


test('actual individual command and file rows restore explicit expansion without crossing sessions or verbose intentions',()=>{
 const renderRow=(item,extra={})=>renderToStaticMarkup(React.createElement(SourceMessage,{item,sessionKey:'session-a',...extra}));
 const command={id:'command',type:'commandExecution',status:'completed',command:'printf hello',aggregatedOutput:'actual command output'};
 const file={id:'read',type:'commandExecution',status:'completed',command:'cat app.ts',commandActions:[{type:'read',path:'/app.ts'}],aggregatedOutput:'const actual = 1;\n'};
 toolRowExpansion.clear();toolGroupExpansion.clear();
 try {
  for(const [item,body] of [[command,'src-cmd-card'],[file,'sft-card']]){
   assert.match(renderRow(item),/aria-expanded="false"/);assert.doesNotMatch(renderRow(item),new RegExp(body));
   toolRowExpansion.set(rowExpansionKey('session-a',item.id),true);
   const restored=renderRow({...item});assert.match(restored,/aria-expanded="true"/);assert.match(restored,new RegExp(body));
   assert.doesNotMatch(renderRow(item,{sessionKey:'session-b'}),new RegExp(body));
   assert.equal(toolGroupExpansion.get(groupExpansionKey('session-a',item.id)),undefined);
   toolRowExpansion.set(rowExpansionKey('session-a',item.id),false);
   assert.match(renderRow(item,{transcriptView:'verbose'}),new RegExp(body));
   assert.doesNotMatch(renderRow(item,{transcriptView:'normal'}),new RegExp(body));
   assert.equal(toolRowExpansion.get(rowExpansionKey('session-a',item.id)),false);
  }
 }finally{toolRowExpansion.clear();toolGroupExpansion.clear();}
});


test('actual plugin detail replaces the list with back header and tabs, without invented actions or dates', () => {
 const plugin = { id: 'p', name: 'A <script>', author: 'Real Author', marketplaceName: 'Local Market', enabled: false };
 const detail = { description: '<img src=x>', skills: [{ name: 'audit', description: 'Review code' }], hooks: [{ key: 'hook-key', eventName: 'PreToolUse' }], mcpServers: ['server'] };
 const props = { plugin, detail, skills: [{ pluginId: 'p', skillName: 'audit', path: '/audit/SKILL.md' }], view: { tab: 'skills', query: '' }, onView() {}, onBack() {}, onSkill() {} };
 const renderDetail = extra => renderToStaticMarkup(React.createElement(PluginDetail, { ...props, ...extra }));
 const html = renderDetail({});
 // 0.2.107: CDS ghost back Button; its label is wrapped in .ssb-content, same adjacency otherwise.
 assert.match(html, /data-cz-detail="plugin"/); assert.match(html, /Plugins<\/span><\/button><\/div><div class="cz-drill-scroll/);
 // c36b3644c:560–577 uses the shared heading-semibold typography.
 assert.match(html, /<h2 class="text-heading-semibold">A &lt;script&gt;<\/h2>/);
 // settings-14: the Description left the header for the Overview tab (c12456454 ni -> cae01a6fc W), still escaped text.
 const overview = renderDetail({ view: { tab: 'overview', query: '' } });
 assert.match(overview, /<p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">&lt;img src=x&gt;<\/p>/); assert.doesNotMatch(overview, /<img |<script>/);
 assert.match(html, /Marketplace \(/); assert.match(html, /Real Author/);
 // settings-14 (2.42304.0 c24c8737b pc Kt): Overview first, then the content tabs in their order.
 assert.deepEqual([...html.matchAll(/role="tab"[^>]*>([^<]*)</g)].map(m => m[1]), ['Overview', 'Skills', 'Connectors', 'Hooks']);
 assert.match(html, /role="tabpanel"/); assert.match(html, /<button[^>]*class="cz-plugin-item"[^>]*><span>\/audit/);
 assert.doesNotMatch(html, /<table|<aside|<script>|<img |role="switch"|<time|Search skills|data-plugin-hooks/);
 // R04 c26e90ba3 qt: a non-local plugin's "Last updated" is the muted "—" (no backend date is invented).
 assert.match(html, /<div><span>Last updated<\/span><div><span class="text-muted">—<\/span><\/div><\/div>/);
 const hooks = renderDetail({ view: { tab: 'hooks', query: '' } });
 assert.match(hooks, /data-plugin-hooks/); assert.match(hooks, /<div class="cz-plugin-item"><span>PreToolUse<\/span><small[^>]*>hook-key/);
 assert.doesNotMatch(hooks, /data-plugin-skills|class="cz-plugin-item"[^>]*onClick/);
 const connectors = renderDetail({ view: { tab: 'connectors', query: '' } });
 // R04 c36b3644c fe rows: without a connectors catalog or onConnector, a muted non-interactive row named by the server.
 assert.match(connectors, /data-plugin-mcp/); assert.match(connectors, /<div class="flex items-center gap-3 px-3 py-1\.5 text-left rounded-lg text-sm w-full text-muted" data-connector-name="server">.*<span class="truncate">server<\/span>/);
 assert.doesNotMatch(connectors, /data-plugin-skills|data-plugin-hooks|<small/);
 const error = renderDetail({ detail: null, error: 'Read failed' });
 assert.match(error, /role="alert">Read failed/); assert.doesNotMatch(error, /Loading plugin details|role="tablist"/);
 // F13: c36b3644c be shows the c9d36aa51 skeleton until plugin/read answers; an empty plugin still has Kt's Overview (settings-14).
 const loading = renderDetail({ detail: null }); assert.match(loading, /data-testid="plugin-page-skeleton"/); assert.doesNotMatch(loading, /Loading plugin details/);
 const empty = renderDetail({ detail: {} }); assert.deepEqual([...empty.matchAll(/role="tab"[^>]*>([^<]*)</g)].map(m => m[1]), ['Overview']); assert.doesNotMatch(empty, />Agents<|role="tab" disabled=""/);
 assert.match(empty, /data-plugin-overview=""/); assert.doesNotMatch(empty, /doesn’t have any skills or agents/);
});


// Working line (turnStatusRows ruling, 2.42304.0 c96d752d0 w8 gate-on branch): these two pins moved from the classic Y5
// row (sts-* spans, visible activity labels) to the official Het / CDS TurnStatus DOM. The intent they pin is unchanged:
// only the owned turn's time and usage are shown, and the tasks button's placement in each state.
test('actual runtime status renders only owned tool activity and keeps time/usage absent when not established', () => {
 const props = { sessionKey:'a', turnId:'turn', ready:true, connected:true, running:true, items:[{id:'c',turnId:'turn',type:'commandExecution',status:'inProgress'}] };
 const renderStatus = extra => renderToStaticMarkup(React.createElement(SourceTranscriptStatus, {...props,...extra}));
 const html = renderStatus({turnStats:{turnId:'other',startedAt:1,outputTokens:999}});
 // w8 shows no activity text in the stats state; the CDS status announces "Working…" and the row is busy.
 assert.match(html,/data-testid="code-working-line" data-turn-working="true"/); assert.match(html,/data-cds="TurnStatus" data-state="busy"/);
 assert.match(html,/<span class="sr-only" role="status" aria-live="polite">Working…<\/span>/);
 assert.doesNotMatch(html,/999 tokens|Waiting for Claude|Running tools|tabular-nums">\d/);
 const stopped = renderStatus({stopping:true});assert.match(stopped,/>Stopping<\/span>/);assert.doesNotMatch(stopped,/Running tools|tokens/);
 const idle = renderStatus({running:false});assert.match(idle,/data-transcript-status="idle"/);assert.doesNotMatch(idle,/role="status"|Running tools/);
 assert.equal(renderStatus({approvalVisible:true}), '');
 assert.doesNotMatch(renderStatus({connected:false}), /Running tools|tokens|data-turn-working="true"/);
});

test('Y5 running-tasks button sits after the stats, alone when idle, after Stopping, and stays reachable', () => {
 const props = { sessionKey:'a', turnId:'turn', ready:true, connected:true, running:true, items:[], turnStats:{turnId:'turn',startedAt:Date.now()/1000-30,outputTokens:287}, onToggleTasksPane(){} };
 const renderStatus = extra => renderToStaticMarkup(React.createElement(SourceTranscriptStatus, {...props,...extra}));
 // w8 K: CdsButton ghost / xs / flush both with "text-inherit hover:text-accent before:…", pressed while the pane is open.
 const button = html => html.match(/<button[^>]*data-cds="Button"[^>]*>.*?<\/button>/)?.[0];
 const running = renderStatus({runningTaskCount:1});
 const runningButton = button(running);
 assert.ok(runningButton); assert.match(runningButton, /type="button"/); assert.match(runningButton, /aria-pressed="false"/);
 for (const attribute of ['data-cds-ghost=""','data-size="xs"','text-inherit hover:text-accent']) assert.ok(runningButton.includes(attribute), attribute);
 assert.match(runningButton, />1 running task<\/span><\/button>/);
 // Stats state (SSR has no elapsed clock): the button is the only trailing item, in w8's epitaxy-status-control span.
 assert.match(running, /<span class="epitaxy-status-control inline-flex min-w-0 items-center gap-xs"><span class="epitaxy-status-control inline-flex items-center"><button/);
 assert.match(running, /role="status"/); assert.doesNotMatch(running, /class="source-transcript-status[^"]*"[^>]*aria-hidden/);
 assert.match(renderStatus({runningTaskCount:3, tasksPaneOpen:true}), /aria-pressed="true"[^>]*>.*3 running tasks/);
 const idle = renderStatus({running:false, runningTaskCount:2, tasksPaneOpen:true});
 assert.match(idle, /data-transcript-status="idle"/); assert.match(idle, /data-cds="TurnStatus" data-state="done"/);
 // Het without quiet: no aria-hidden / invisible container hides the idle button.
 assert.match(idle, /<div data-testid="code-working-line" data-turn-working="false" class="flex min-h-control flex-col"><div data-closed="" data-cds="TurnStatus"/, 'no aria-hidden container hides the idle button');
 assert.match(idle, /<button[^>]*aria-pressed="true"[^>]*>.*2 running tasks/);
 const stopping = renderStatus({stopping:true, runningTaskCount:1});
 assert.match(stopping, />Stopping<\/span>.*<button[^>]*>.*1 running task/);
 // No toggle (no side panes), no tasks, retry and approval-replaced rows keep the prior DOM.
 assert.equal(button(renderStatus({runningTaskCount:1, onToggleTasksPane:null})), undefined);
 assert.equal(renderStatus({running:false, runningTaskCount:0}), renderStatus({running:false, onToggleTasksPane:null}));
 assert.match(renderStatus({running:false, runningTaskCount:0}), /data-turn-working="false" class="flex min-h-control flex-col"><\/div>/);
 assert.equal(button(renderStatus({retrying:'Overloaded', runningTaskCount:1})), undefined);
 assert.equal(renderStatus({approvalVisible:true, runningTaskCount:1}), '');
});

test('running background command puts View live output in the row heading, not the body footer', () => {
 const opened = [];
 const busy = {id:'bg',type:'commandExecution',status:'inProgress',processId:'process-1',command:'sleep 30',aggregatedOutput:'tick'};
 const renderRow = (item, extra={}) => renderToStaticMarkup(React.createElement(SourceMessage,{item,sessionKey:'live-row',transcriptView:'verbose',agentContext:{onTask:id=>opened.push(id)},...extra}));
 const html = renderRow(busy);
 assert.equal(html.match(/src-cmd-live/g)?.length, 1);
 const trigger = html.indexOf('source-step-trigger'), live = html.indexOf('src-cmd-live'), detail = html.indexOf('source-step-detail'), footer = html.indexOf('src-cmd-footer');
 assert.ok(trigger >= 0 && trigger < live && live < detail, 'inside .source-step-trigger');
 assert.ok(footer > detail, 'the running footer still renders in the body'); assert.ok(!html.slice(footer).includes('src-cmd-live'));
 assert.match(html, /<button type="button" class="src-cmd-live" data-row-live="">View live output<\/button>/);
 assert.ok(live < html.indexOf('source-step-caret'), 'before the caret');
 assert.doesNotMatch(renderRow({...busy,status:'completed',exitCode:0}), /src-cmd-live|View live output/);
 assert.doesNotMatch(renderRow({...busy,processId:null}), /src-cmd-live/);
 assert.doesNotMatch(renderRow(busy,{agentContext:undefined}), /src-cmd-live/);
});

test('actual Developer header exposes only supported deletion and retains truthful transport/errors', () => {
 const definition = { name:'local', command:'node', args:['<script>'], environmentNames:['TOKEN'] };
 const props = { desktop:{mcpDefinitions:[definition],servers:[{name:'local',toolsError:'<img src=x>'}]}, connected:true, onRemove() { throw Error('SSR cannot delete'); } };
 const renderPage = extra => renderToStaticMarkup(React.createElement(DeveloperServers,{...props,...extra}));
 const html = renderPage({});
 assert.match(html, /ss-mcp-title/);
 // shared-frame ks + Developer N: native ghost/sm icon-only button; attribute order is immaterial.
 const deleteButton = html.match(/<button[^>]*aria-label="Delete"[^>]*>/)?.[0];
 assert.ok(deleteButton);
 for (const attribute of ['data-cds="Button"', 'data-variant="ghost"', 'data-size="sm"', 'data-cds-icon-only=""']) assert.ok(deleteButton.includes(attribute));
 assert.match(deleteButton, /class="source-settings-button ssp-button ss-mcp-delete"/);
 assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;img src=x&gt;/);
 assert.doesNotMatch(html, /<script>|<img |View logs|TOKEN=/);
 assert.match(renderPage({connected:false}), /aria-label="Delete"[^>]*disabled=""/);
 assert.match(renderPage({pending:true}), /aria-label="Delete"[^>]*disabled=""/);
 assert.doesNotMatch(renderPage({onRemove:undefined}), /aria-label="Delete"/);
 assert.doesNotMatch(renderPage({desktop:{mcpDefinitions:[definition],servers:[{name:'local',pluginId:'plugin'}]}}), /aria-label="Delete"/);
 const missing = renderPage({desktop:{mcpDefinitions:[],servers:[{name:'local'}]}});
 assert.doesNotMatch(missing, /aria-label="Delete"/); assert.match(missing, /Configuration details are unavailable/);
 assert.doesNotMatch(renderPage({desktop:{mcpDefinitions:[{name:'dotted.name'}],servers:[]}}), /aria-label="Delete"/);
});


test('actual Skills preview renders real metadata and Markdown, never HTML execution or unsafe URLs', () => {
  const content = '---\nname: Internal name\ndescription: Not repeated\nmetadata:\n  author: "<img onerror=x>"\n---\n# Real heading\n\n**Bold** and [docs](https://example.test) [bad](javascript:alert%281%29)\n\n<script>alert(1)</script>';
  const html = renderToStaticMarkup(React.createElement(SourceSkillFile, { content }));
  assert.match(html, /data-file-mode="normal"/);
  assert.match(html, /<h1>Real heading<\/h1>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /&lt;img onerror=x&gt;/);
  assert.match(html, /href="https:\/\/example.test\/"/);
  assert.doesNotMatch(html, /Not repeated|Internal name|<script|<img|href="javascript/);
  assert.match(html, /role="radiogroup" aria-label="File view mode"/);
  assert.match(html, /aria-label="Preview" aria-checked="true" tabindex="0"/);
  assert.match(html, /aria-label="Code" aria-checked="false" tabindex="-1"/);
  assert.doesNotMatch(html, /aria-label="(?:Edit|Copy)"/);
});

test('actual Skills source renders line numbers, inert source markup and the terminal empty line', () => {
  const html = renderToStaticMarkup(React.createElement(SkillSource, { content: '<script>bad</script>\r\n\n' }));
  assert.equal((html.match(/data-skill-source-line=""/g) || []).length, 3);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /--skf-number-width:2.3rem/);
});


test('actual large Skills file bypasses Markdown and per-line DOM without truncating source', () => {
  const content = '# Keep literal heading\n' + '\n'.repeat(10000) + '<script>safe tail</script>';
  const html = renderToStaticMarkup(React.createElement(SourceSkillFile, { content }));
  assert.match(html, /Showing this large file as plain text/);
  assert.match(html, /# Keep literal heading/);
  assert.match(html, /&lt;script&gt;safe tail&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<h1>|data-skill-source-line|<script/);
});


test('actual partial Changes shows truthful line-info gaps and no fake expand controls or tail', () => {
  const value = '--- a/demo.txt\n+++ b/demo.txt\n@@ -7 +7 @@\n-old\n+new\n@@ -41 +41 @@\n-last\n+final\n';
  for (const layout of ['unified','split']) {
    const html=renderToStaticMarkup(React.createElement(SourceDiff,{value,layout}));
    assert.match(html,/6 unmodified lines/); assert.match(html,/33 unmodified lines/);
    assert.doesNotMatch(html,/sdiff-hunk-header|More unchanged|Expand all|data-expand-index/);
    assert.match(html,/data-old-line="7"/); assert.match(html,/data-new-line="41"/);
  }
});

test('actual Changes beginning at line one omits the synthetic hunk header while retaining code', () => {
  const value='--- a/demo.txt\n+++ b/demo.txt\n@@ -1 +1 @@\n-old\n+new\n';
  const html=renderToStaticMarkup(React.createElement(SourceDiff,{value}));
  assert.doesNotMatch(html,/sdiff-hunk-separator|sdiff-hunk-header/);
  assert.match(html,/>old<\//); assert.match(html,/>new<\//);
});


test('actual settings select exposes the selected real label without hidden native options or an invented fallback', () => {
  const items=[{value:'light',label:'Claude Light'},{value:'dark',label:'<img> Dark'}];
  const html=renderToStaticMarkup(React.createElement(SourceSelect,{label:'Theme',value:'dark',items,onChange(){throw Error('SSR cannot save');}}));
  assert.match(html,/role="combobox" aria-label="Theme"/);assert.match(html,/aria-haspopup="listbox" aria-expanded="false"/);
  assert.match(html,/&lt;img&gt; Dark/);assert.doesNotMatch(html,/<select|<option|<img|role="listbox"/);
  const missing=renderToStaticMarkup(React.createElement(SourceSelect,{label:'Theme',value:'unknown',items}));
  assert.doesNotMatch(missing,/Claude Light|Dark/);
});
test('actual settings select preserves numeric selection and disabled semantics', () => {
  const html=renderToStaticMarkup(React.createElement(SourceSelect,{label:'Archive',value:0,items:[{value:0,label:'Never'}],disabled:true}));
  assert.match(html,/data-value="0" disabled=""/);assert.match(html,/>Never<\/span>/);assert.match(html,/data-disabled="true"/);
});


test('response tasks use read-only Code markers, preserving ordinary, nested, and loose list text', () => {
  const compact = render('- [x] Done **bold**\n- [ ] Pending `src/app.ts`\n  - [x] Nested done\n- ordinary');
  assert.equal((compact.match(/class="smd-task-item"/g)||[]).length, 3);
  assert.equal((compact.match(/data-done="true"/g)||[]).length, 2);
  assert.equal((compact.match(/class="smd-task-circle"/g)||[]).length, 1);
  assert.match(compact, /<span class="sr-only">done<\/span>/);
  assert.match(compact, /<span class="sr-only">not done<\/span>/);
  assert.match(compact, /<strong>bold<\/strong>/);
  assert.match(compact, /data-file-ref="src\/app.ts"/);
  assert.match(compact, /<li>ordinary<\/li>/);
  assert.doesNotMatch(compact, /<input|role="checkbox"/);
  const loose = render('- [x] First paragraph\n\n  Second paragraph\n\n  - [ ] Nested pending\n\n- [ ] Last <img src=x onerror=alert(1)>');
  assert.equal((loose.match(/class="smd-task-item"/g)||[]).length, 3);
  assert.match(loose, /<p>Second paragraph<\/p>/);
  // markdown-current:4954–5002 rl/il unwrap the first paragraph even in loose lists.
  assert.match(loose, /class="smd-task-content">\n First paragraph/);
  assert.doesNotMatch(loose, /<p> First paragraph<\/p>/);
  assert.doesNotMatch(loose, /<input|<img/);
  assert.match(loose, /&lt;img src=x onerror=alert\(1\)&gt;/);
  const literal = render('```text\n- [x] Literal\n```');
  assert.doesNotMatch(literal, /smd-task-marker/);
});

test('actual settings segments keep controlled selection, a single reachable radio and safe labels', () => {
 const options=[{value:'light',label:'<Light>',icon:'Sun'},{value:'dark',label:'Dark'}];
 const renderGroup=extra=>renderToStaticMarkup(React.createElement(SourceSegments,{label:'Theme',value:'light',options,onChange(){throw Error('Rendering cannot save settings');},...extra}));
 const html=renderGroup({});assert.match(html,/data-cds="SegmentedControl" role="radiogroup" aria-label="Theme"/);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert.equal((html.match(/aria-checked="true"/g)||[]).length,1);
 assert.match(html,/aria-label="&lt;Light&gt;"/);assert.doesNotMatch(html,/<Light>/);assert.match(html,/class="ss-segment-track" aria-hidden="true"/);
 const unknown=renderGroup({value:'unknown'});assert.doesNotMatch(unknown,/aria-checked="true"/);assert.equal((unknown.match(/tabindex="0"/g)||[]).length,1);
 assert.equal((renderGroup({disabled:true}).match(/disabled=""/g)||[]).length,2);
});

 test('code font uses actual immediate TextInput without a Save control and escapes raw values', () => {
  const html=renderToStaticMarkup(React.createElement(SourceCodeFontSetting,{value:'<script> & "Font"',placeholder:'e.g. JetBrains Mono',onSave(){throw Error('SSR must not persist');}}));
  assert.match(html,/data-cds="TextInput"/);assert.match(html,/aria-label="Code font family"/);
  assert.match(html,/maxLength="120"/);assert.match(html,/&lt;script&gt; &amp; &quot;Font&quot;/);
  assert.doesNotMatch(html,/<button|<form|<script>|disabled=/);
});

test('streaming Markdown reveals prose without breaking safe links, task markers or fence source', () => {
 const html=render('Hello **world** and [`src/app.ts`](src/app.ts:2).\n\n- [x] Read file\n\n```js\nconst x = "<img>";\n```',{isStreaming:true});
 assert.match(html,/data-response-reveal=""/);assert.match(html,/data-file-ref="src\/app.ts"/);
 assert.match(html,/class="smd-task-marker"/);assert.doesNotMatch(html,/<input/);
 const code=html.match(/<code[^>]*class="scb-code"[^>]*>([\s\S]*?)<\/code>/)?.[1];
 assert.ok(code);assert.doesNotMatch(code,/data-response-reveal|<img>/);assert.match(code,/&lt;img&gt;/);
 const history=render('A'.repeat(401),{isStreaming:true});assert.doesNotMatch(history,/data-response-reveal/);
});


test('streaming open inline formatting renders actual semantic elements and safely returns to literal text when stopped',()=>{
 for(const [source,tag] of [['**bold','strong'],['_italic','em'],['~~deleted','del'],['`raw <img onerror=alert(1)>','code']]){
  const html=render(source,{isStreaming:true});assert.match(html,new RegExp('<'+tag+' data-incomplete=""'));assert.doesNotMatch(html,/<img/);
  assert.doesNotMatch(render(source,{isStreaming:false}),/data-incomplete/);
 }
 const link=render('[partial](https://example.com/part',{isStreaming:true});assert.match(link,/href="https:\/\/example.com\/part"/);
 const unsafe=render('[label](javascript:alert(1)',{isStreaming:true});assert.doesNotMatch(unsafe,/<a |javascript:/);assert.match(unsafe,/label/);
});


test('Developer empty state uses original theme-aware 70×71 illustration; advanced server data starts collapsed',()=>{
 const empty=renderToStaticMarkup(React.createElement(DeveloperServers,{desktop:{servers:[],mcpDefinitions:[]},connected:true}));
 assert.match(empty,/class="ss-mcp-empty-illustration" width="70" height="71" viewBox="0 0 70 71"/);assert.equal((empty.match(/--mcp-path-light:/g)||[]).length,4);assert.match(empty,/No servers added/);
 const detail=renderToStaticMarkup(React.createElement(DeveloperServers,{desktop:{servers:[],mcpDefinitions:[{name:'local',command:'node',environmentNames:['PATH']}]},connected:true}));
 assert.match(detail,/data-cds="Collapsible"/);assert.match(detail,/aria-expanded="false"/);assert.doesNotMatch(detail,/<details|<summary|source-disclosure-panel|>PATH</);
});

test('actual skill Preview uses safe generic code groups and normalized text while raw source retains its contents', () => {
  const content='## Code\n\n```TypeScript\n  const x = "<img>"; \n\n```\n\n```\nplain\n```';
  const html=renderToStaticMarkup(React.createElement(SourceSkillFile,{content}));
  assert.match(html,/role="group" aria-label="typescript code" tabindex="0"/);
  assert.match(html,/class="sdc-label">TypeScript</);
  assert.match(html,/aria-label="Copy to clipboard"/);
  assert.match(html,/const x = &quot;&lt;img&gt;&quot;;<\/code>/);
  assert.match(html,/data-wrap="true"/);
  assert.doesNotMatch(html,/<img|scb-flow/);
  const raw=renderToStaticMarkup(React.createElement(SkillSource,{content}));
  assert.match(raw,/const x = &quot;&lt;img&gt;&quot;; /);
  assert.doesNotMatch(raw,/sdc-block/);
});

test('actual response Markdown routes formulas separately from code and keeps open display math as source',()=>{
 const render=text=>renderToStaticMarkup(React.createElement(SourceMessage,{sessionKey:'math-test',item:{id:'math',type:'agentMessage',text}}));
 const block=render('$$\nx^2\n$$');assert.match(block,/class="math-display srm-display"/);assert.doesNotMatch(block,/<p><div|scb-block/);
 const open=render('$$\nx^2');assert.match(open,/data-incomplete=""/);assert.match(open,/\$\$\nx\^2/);
 const inline=render(String.raw`Value \(x^2\) here`);assert.match(inline,/class="math-inline srm-inline"/);
 const fence=render('```math\nx^2\n```');assert.match(fence,/class="math-display srm-display"/);assert.doesNotMatch(fence,/Copy code/);
 const code=render('```js\n$$ x^2 $$\n```');assert.match(code,/scb-block/);assert.doesNotMatch(code,/srm-display/);
});

test('AI images use scoped local loaders and inline image elements, with honest remote link fallbacks',()=>{
 const render=text=>renderToStaticMarkup(React.createElement(SourceMessage,{sessionKey:'image-test',cwd:'/fixture',item:{id:'image',type:'agentMessage',text}}));
 const local=render('![Plot](./plot.png)');assert.match(local,/sri-placeholder/);assert.doesNotMatch(local,/src="\.\/plot.png"/);
 const remote=render('![Remote chart](https://example.test/plot.png)');assert.match(remote,/href="https:\/\/example.test\/plot.png"/);assert.doesNotMatch(remote,/<img/);
 const inline=render('![Pixel](data:image/png;base64,iVBORw0KGgo=)');assert.match(inline,/<img/);assert.match(inline,/data:image\/png;base64/);assert.doesNotMatch(inline,/<script/);
});

test('actual Code footnote rendering preserves named superscripts and in-place definitions without generated footer or hash links',()=>{
 const text='First[^Named], repeated[^Named], unknown[^Missing].\n\n[^Named]: Definition **bold** and `code`.\n\nFollowing paragraph.\n\n[^Named]: Duplicate.';
 const render=()=>renderToStaticMarkup(React.createElement(SourceMessage,{sessionKey:'footnotes',item:{id:'notes',type:'agentMessage',text}}));
 const html=render();assert.equal((html.match(/<sup>\[Named\]<\/sup>/g)||[]).length,2);assert.match(html,/<sup>\[Missing\]<\/sup>/);
 assert.equal((html.match(/class="footnote-def"/g)||[]).length,2);assert.ok(html.indexOf('Definition')<html.indexOf('Following paragraph'));assert.ok(html.indexOf('Following paragraph')<html.indexOf('Duplicate.'));
 assert.match(html,/<strong>bold<\/strong>/);assert.doesNotMatch(html,/data-footnote|footnote-backref|user-content-fn|Footnotes|href="#|\sid="/);
 assert.equal(render(),html);
});
test('Code footnote labels are safe literal content; generic Skills preview keeps its own Markdown branch',()=>{
 const text='Label[^<script>bad</script>] and [^A&amp;B].\n\n[^<script>bad</script>]: Literal label.';
 const html=renderToStaticMarkup(React.createElement(SourceMessage,{sessionKey:'safe-footnotes',item:{id:'notes',type:'agentMessage',text}}));
 assert.match(html,/\[&lt;script&gt;bad&lt;\/script&gt;\]/);assert.match(html,/\[A&amp;amp;B\]/);assert.doesNotMatch(html,/<script|href="#/);
 const skill=renderToStaticMarkup(React.createElement(SourceSkillFile,{content:'Text[^a]\n\n[^a]: Note'}));assert.doesNotMatch(skill,/class="footnote-def"/);
});

test('Code response preserves soft line breaks within text, emphasis, links, lists and quotes',()=>{
 const html=render('First line\nSecond **bold\ncontinued** [link\nlabel](https://example.test).\n\n> quoted\n> next\n\n- first\n  continuation\n\n  second paragraph');
 assert.match(html,/First line<br\/>\nSecond/);assert.match(html,/<strong>bold<br\/>\ncontinued<\/strong>/);assert.match(html,/link<br\/>\nlabel/);
 assert.match(html,/<blockquote>\n<p>quoted<br\/>\nnext<\/p>/);assert.match(html,/<li>\nfirst<br\/>\ncontinuation\n<p>second paragraph<\/p>/);
 assert.doesNotMatch(html,/<li>\n<p>first/);
 const hard=render('First  \nSecond\\\nThird');assert.equal((hard.match(/<br\/>/g)||[]).length,2);
 const crlf=render('First\r\nSecond');assert.match(crlf,/First<br\/>\nSecond/);
});

test('Code table break spelling is source-limited and does not execute HTML or alter code atoms',()=>{
 const html=render('| A | B |\n| --- | --- |\n| one<br>two<BR />three | **bold<br/>next** |\n| &lt;br&gt;visible | `literal<br>` <img src=x onerror=bad> |');
 assert.equal((html.match(/<br\/>/g)||[]).length,4);assert.match(html,/<strong>bold<br\/>\nnext<\/strong>/);assert.match(html,/literal&lt;br&gt;/);assert.doesNotMatch(html,/<img|onerror="/);
 const ordinary=render('Outside <br> literal\n\n```text\nfirst\nsecond<br>\n```');assert.match(ordinary,/Outside &lt;br&gt; literal/);assert.doesNotMatch(ordinary,/<br\/>/);assert.match(ordinary,/second&lt;br&gt;/);
});

test('Code definition label and leading paragraph share inline flow while later list paragraphs retain blocks',()=>{
 const html=render('Text[^n]\n\n[^n]: Definition **bold**.\n\n1. First\n\n   Second\n\n   > Quote\n\n2. Next');
 assert.match(html,/<div class="footnote-def"><sup>\[n\] <\/sup>Definition <strong>bold<\/strong>\.<\/div>/);
 assert.match(html,/<li>\nFirst\n<p>Second<\/p>\n<blockquote>/);assert.doesNotMatch(html,/<p>First<\/p>|<p>Definition/);
});
