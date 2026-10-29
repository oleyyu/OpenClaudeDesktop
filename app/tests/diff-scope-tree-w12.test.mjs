// W12 diff-scope-tree: the Changes scope trigger (3.6556.2 cccc2cf0a $S / rC / QS / iC, c03935b01 $n) and the Changed
// files tree's memory (c44d00c7f Ho / Xo / Ko and the Ta / Aa / Na maps, Jo's unmount focus hand-back). Original text
// pinned from the 3.6556.2 snapshot (parsed, never executed), generated slices exercised directly, SSR for the markup.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(V1, name), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const h = React.createElement;
let server;
const ssr = (file) => server.ssrLoadModule(file);
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

test('3.6556.2 originals: $S trigger branches, rC tooltip, QS / iC, $n gate, Ho / Xo / Ko memory, Jo focus hand-back', () => {
  const tile = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of ['i=ii("text-secondary")', 'f=Ul()', 'B=f?i:"text-secondary"', 'R("shrink min-w-0",i)',
    'className:"flex min-w-0 items-center text-body text-muted-as-secondary",children:q', 'className:"min-w-0 truncate",children:J',
    '[o,s,c].some(eC)?J:void 0', 'o=!i&&void 0', 'u(ee,{content:t,open:o,children:n})', 'u(rC,{tooltip:te,trigger:ie,children:oe})',
    'function QS(e){if(e===null)return!1;if(e.scrollWidth>e.clientWidth)return!0;', 'r?`${r.shortSha} ${r.subject||n}`:e.slice(0,7)',
    'className:"grid min-w-0 grid-cols-[minmax(0,max-content)_auto_minmax(0,max-content)] items-center gap-xs"'])
    assert.ok(tile.includes(text), `cccc2cf0a: ${text}`);
  assert.ok(official('c03935b01-yhcY34vt.js').includes('function $n(){return!v("__gb__3676555858")}'));
  assert.ok(official('shared-18-D3y8YMFN.js').includes('function Mb(e){return jb()?void 0:e}'));
  const diff = official('c44d00c7f-Cr1FDL2F.js');
  for (const text of ['function ka(e,t,n,r){if(e===void 0)return;let i=Da(e,t,r);n.collapsed.size===0?Ta.delete(i):Ta.set(i,n)}', 'Pa=32',
    'scope:"source",activePath:c,holdsActive:D,jumps:O', 'c.size>0&&b(c)', '(v||ja(g,s,f)?.open!==!0)&&A(v)', 'g.current=!0;let a=new(ue(e))',
    'onKeyDownCapture:Z,onFocus:ns,onScroll:M,onContextMenu:V', 'focusVisible:r.matches(":focus-visible")',
    `(e?.querySelector('[role="group"][tabindex="0"]')??e)?.focus(i)`])
    assert.ok(diff.includes(text), `c44d00c7f: ${text}`);
});

test('generated slices: QS clip check, iC commit label (with "(no message)"), the model trigger', async () => {
  const { scopeLabelClipped, commitScopeTriggerLabel } = await ssr('/src/generated/files-changes/diff-scope-label.mjs');
  assert.equal(scopeLabelClipped(null), false);
  assert.equal(scopeLabelClipped({ scrollWidth: 120, clientWidth: 80 }), true);
  const range = (rect) => ({ selectNodeContents() {}, getBoundingClientRect: () => rect });
  const span = (text, box) => ({ scrollWidth: 80, clientWidth: 80, ownerDocument: { createRange: () => range(text) }, getBoundingClientRect: () => box });
  assert.equal(scopeLabelClipped(span({ left: 0, right: 80.05, width: 80.05 }, { left: 0, right: 80 })), false, '≤ 0.1px is not clipped');
  assert.equal(scopeLabelClipped(span({ left: 0, right: 81, width: 81 }, { left: 0, right: 80 })), true);
  assert.equal(scopeLabelClipped(span({ left: 0, right: 0, width: 0 }, { left: 0, right: 80 })), false);
  const commits = [{ sha: 'a'.repeat(40), shortSha: 'aaaaaaa', subject: '' }];
  assert.equal(commitScopeTriggerLabel('a'.repeat(40), commits, '(no message)'), 'aaaaaaa (no message)');
  assert.equal(commitScopeTriggerLabel('b'.repeat(40), commits, '(no message)'), 'bbbbbbb');
  const model = await ssr('/src/diff-scope-model.mjs');
  const trigger = model.diffScopeTrigger({ kind: 'commit', sha: 'a'.repeat(40) }, { base: 'main', commits: [{ ...commits[0], subject: 'Fix it' }] });
  assert.deepEqual(trigger, { label: 'aaaaaaa Fix it', ariaLabel: 'Diff scope: aaaaaaa Fix it', branch: null, range: { base: 'main', head: 'working tree' } });
});

test('$S / rC: tooltip trigger over the ghost button; non-branch label span; Ul() gate and the !f span in the source', async () => {
  const { SourceDiffScope, diffScopeMenuEnabled, DIFF_SCOPE_MENU_OFF_FLAG } = await ssr('/src/source-diff-scope.jsx');
  const model = await ssr('/src/diff-scope-model.mjs');
  assert.equal(DIFF_SCOPE_MENU_OFF_FLAG, '__gb__3676555858');
  assert.equal(diffScopeMenuEnabled(), true, 'an unlisted GrowthBook flag is off, so $n() offers the menu');
  const commit = renderToStaticMarkup(h(SourceDiffScope, { trigger: model.diffScopeTrigger({ kind: 'commit', sha: 'a'.repeat(40) },
    { base: 'main', commits: [{ sha: 'a'.repeat(40), shortSha: 'aaaaaaa', subject: 'Fix it' }] }) }));
  // rC: the CdsDropdown TriggerButton (ghost) inside the tooltip, one Root with the Popup (W12 diff-cont).
  assert.match(commit, /^<button type="button" data-cds="Button" data-cds-ghost="" class="cds-reset [^"]* shrink min-w-0 text-secondary" aria-label="Diff scope: aaaaaaa Fix it" data-base-ui-tooltip-trigger="" tabindex="0" aria-haspopup="menu" aria-expanded="false" id="[^"]+">/);
  assert.match(commit, /<span class="inline-flex min-w-0 items-center gap-1 "><span class="min-w-0 truncate">aaaaaaa Fix it<\/span><span data-cds="Icon"[^>]*data-cds-part="menu-caret"/);
  const jsx = source('src/source-diff-scope.jsx');
  assert.match(jsx, /if \(!diffScopeMenuEnabled\(\)\) return <span className="flex min-w-0 items-center text-body text-muted-as-secondary">\{grid\}<\/span>;/);
  assert.match(jsx, /\[baseRef, headRef, labelRef\]\.some\(\(ref\) => scopeLabelClipped\(ref\.current\)\) \? trigger\.label : undefined/);
  assert.match(jsx, /<CdsDropdown\.Root open=\{open\} onOpenChange=\{setOpen\}>\n\s+<CdsTooltip content=\{tooltip\} open=\{!open && undefined\}>\{trigger\}<\/CdsTooltip>\n\s+\{children\}\n\s+<\/CdsDropdown\.Root>;/);
  assert.match(jsx, /import \{ asElementNode, CdsDropdown, CdsIcon, CdsTooltip, useCdsOwnerWindow, useCdsOwnerWindowAnchor \} from "\.\/generated\/view-tabs\/index\.js";/);
});

test('Ta / Aa / Na memory (generated): per session + scope, "diff:" tiles only, scroll top for at most 32 lists', async () => {
  const m = await ssr('/src/generated/files-changes/diff-tree-memory.mjs');
  assert.equal(m.readTreeCollapsed(undefined, 'source'), undefined);
  m.writeTreeCollapsed('w12-a', 'source', { collapsed: new Set(['src', 'lib']), activePath: null });
  assert.deepEqual([...m.readTreeCollapsed('w12-a', 'source').collapsed], ['src', 'lib']);
  assert.equal(m.readTreeCollapsed('w12-a', 'source', 'diff'), m.readTreeCollapsed('w12-a', 'source'), 'tile "diff" keys like no tile (Ea)');
  assert.equal(m.readTreeCollapsed('w12-a', 'source', 'diff:repo'), undefined);
  // Uo: a new active file opens the folders that hide it; Go keeps the set otherwise.
  assert.deepEqual([...m.initialTreeCollapsed('w12-a', 'source', undefined, 'src/a.js', true)], ['lib']);
  assert.deepEqual([...m.initialTreeCollapsed('w12-a', 'source', undefined, 'src/a.js', false)], ['src', 'lib']);
  m.writeTreeCollapsed('w12-a', 'source', { collapsed: new Set(), activePath: null });
  assert.equal(m.readTreeCollapsed('w12-a', 'source'), undefined, 'an empty set is deleted');
  // Wo: stored open, else holdsActive; a closed section opens for a new active file inside it.
  assert.equal(m.initialTreeSectionOpen('w12-a', 'test', undefined, null, false), false);
  m.writeTreeSectionOpen('w12-a', 'test', { open: false, activePath: 'test/a.js' });
  assert.equal(m.initialTreeSectionOpen('w12-a', 'test', undefined, 'test/a.js', true), false);
  assert.equal(m.initialTreeSectionOpen('w12-a', 'test', undefined, 'test/b.js', true), true);
  // Fa / Ra / Ia / La.
  const key = m.treeScrollKey('w12-a', { filePaths: ['a', 'b'], asTree: true, groupByKind: true });
  assert.equal(key, 'w12-a\u0000tree+kinds\u0000a\nb');
  m.writeTreeScroll(key, 120);
  assert.equal(m.readTreeScroll(key), 120);
  m.writeTreeScroll(key, 0);
  assert.equal(m.readTreeScroll(key), undefined, 'a top of 0 is not kept');
  for (let index = 0; index < 33; index++) m.writeTreeScroll(`w12-k${index}`, index + 1);
  assert.equal(m.readTreeScroll('w12-k0'), undefined, 'the oldest of 33 is dropped');
  assert.equal(m.readTreeScroll('w12-k32'), 33);
  m.forgetTreeScroll('w12-k32');
  assert.equal(m.readTreeScroll('w12-k32'), undefined);
});

test('Changes tree: remembered folders / sections for the session come back on mount; onScroll and the focus hand-back are wired', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const m = await ssr('/src/generated/files-changes/diff-tree-memory.mjs');
  const value = ['diff --git a/src/a.js b/src/a.js', '--- a/src/a.js', '+++ b/src/a.js', '@@ -1 +1 @@', '-a', '+b',
    'diff --git a/test/t.test.js b/test/t.test.js', '--- a/test/t.test.js', '+++ b/test/t.test.js', '@@ -1 +1 @@', '-a', '+b', ''].join('\n');
  const render = (sessionId) => renderToStaticMarkup(h(D.SourceDiff, { value, placement: 'changes',
    fileList: { sessionId, shown: true, width: 240, tree: true, groupByKind: true } }));
  const folder = (html, name) => html.match(new RegExp(`<button[^>]*aria-expanded="(true|false)"[^>]*>(?:(?!</button>).)*>${name}<`))?.[1];
  const fresh = render('w12-tree');
  assert.match(fresh, /role="tree"/);
  assert.equal(folder(fresh, 'src'), 'true');
  assert.match(fresh, /data-diff-tree-section="test"[^>]*aria-expanded="false"/, 'Wo: a section without the active file starts closed');
  m.writeTreeCollapsed('w12-tree', 'source', { collapsed: new Set(['src']), activePath: null });
  m.writeTreeSectionOpen('w12-tree', 'test', { open: true, activePath: null });
  const remembered = render('w12-tree');
  assert.equal(folder(remembered, 'src'), 'false', 'Ho/Uo: the session\'s collapsed folder stays collapsed');
  assert.match(remembered, /data-diff-tree-section="test"[^>]*aria-expanded="true"/, 'Xo/Wo: the section opened in this session stays open');
  assert.equal(folder(render('w12-other'), 'src'), 'true', 'another session has its own memory');
  const jsx = source('src/source-diff.jsx');
  assert.match(jsx, /onFocus=\{diffTreeFocus\} onScroll=\{onScroll\} onContextMenu=\{preventNativeMenu\}/);
  assert.match(jsx, /useDiffTreeFocusHandBack\(ref\);/);
  assert.match(jsx, /const target = body\.isConnected \? body : pane\?\.isConnected \? diffPaneFocusRoot\(pane\) : null;/);
  assert.match(jsx, /\(target\?\.querySelector\('\[role="group"\]\[tabindex="0"\]'\) \?\? target\)\?\.focus\(options\);/);
  assert.match(jsx, /if \(last !== undefined && !waiting\.current\) writeTreeScroll\(last, lastTop\.current\);/);
  assert.match(source('src/source-session.jsx'), /fileList=\{\{ sessionId: sessionId \|\| undefined, shown: diffShowTree/);
});

test('rC H.Root (W12 diff-cont): CdsDropdown Root / TriggerButton / Popup over ca5db7aaf U (qv), YS item structure', async () => {
  const tile = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of ['h(H.Root,{open:i,onOpenChange:a,children:[s,r]})', 'u(H.TriggerButton,{variant:"ghost",className:ne,"aria-label":re,children:Y})',
    'u(H.Popup,{onContextMenu:Jv,side:"bottom",align:"start",container:a,collisionPadding:oi,children:ae})', 'u(qv,{sections:L,portalContainer:a})',
    'Jo as H', 'import{f as Kv,n as qv,s as Jv}from"./ca5db7aaf-qq5selW3.js"', 'Id as z', 'Sn as oi',
    'value:"diff-base-note",label:A?w("span",{className:"animate-placeholder-reveal"},S):w(_,null,S),disabled:!0',
    'S=A?x:O&&E.length===0?e:void 0', 'p=O?e:A||j?x:r.formatMessage({defaultMessage:"No branches match"', 'f=j||A', 'searchPending:f',
    'label:u(Z,{defaultMessage:"{count, plural, one {# older commit not shown} other {# older commits not shown}}"'])
    assert.ok(tile.includes(text), `cccc2cf0a: ${text}`);
  const pane = official('ca5db7aaf-qq5selW3.js');
  for (const text of ['U as n', 'P as s', 'Jo as d', 'typeof e.label=="string"&&e.label.toLowerCase().includes(t)'])
    assert.ok(pane.includes(text), `ca5db7aaf: ${text}`);
  const frame = official('shared-frame-6jtSkIit.js');
  for (const text of ['GT as Jo', 'ao as Id', 'so as Nd', 'Uc as Iu', 'Xm as Kl']) assert.ok(frame.includes(text), `shared-frame: ${text}`);
  assert.ok(official('shared-18-D3y8YMFN.js').includes('wU as Sn'));
  // The one generated copy of ca5db7aaf U (code-editor preview-pane-menu.mjs) is the menu body, over view-tabs parts.
  const jsx = source('src/source-diff-scope.jsx');
  assert.match(jsx, /const \{ Sections: DiffScopeSections \} = createPreviewPaneMenu\(\{ Menu: CdsDropdown, Tooltip: CdsTooltip, useOwnerWindow: useCdsOwnerWindow, asElement: asElementNode \}\);/);
  assert.match(jsx, /<CdsDropdown\.TriggerButton variant="ghost" className="shrink min-w-0 text-secondary" aria-label=\{trigger\.ariaLabel\}>/);
  assert.match(jsx, /<CdsDropdown\.Popup onContextMenu=\{suppressNativeContextMenu\} side="bottom" align="start" container=\{container\} collisionPadding=\{menuCollisionPadding\}>\n\s+<DiffScopeSections sections=\{menuSections\} portalContainer=\{container\} \/>/);
  assert.match(jsx, /const container = useCdsOwnerWindowAnchor\(\);/);
  assert.doesNotMatch(jsx, /SourceMenu|SourceSettingsButton/, 'the host menu and button are gone');
  assert.match(source('src/generated/code-editor/preview-pane-menu.mjs'), /return \{Menu:H,Sections:U\};|return \{ Menu: H, Sections: U \};/);
  // YS items: the branch rows, then the note row while loading / after a failed empty load; searchPending while loading.
  const model = await ssr('/src/diff-scope-model.mjs');
  const { diffScopeMenuSections } = await ssr('/src/source-diff-scope.jsx');
  const base = (branches) => model.diffScopeSections({ base: 'main', defaultBase: 'main', branches })[1].items[0];
  const loading = base({ list: [], loaded: false, error: false });
  assert.equal(loading.searchPending, true);
  assert.equal(loading.searchEmptyLabel, 'Loading branches…');
  assert.deepEqual(loading.items.map((row) => [row.value, row.label, row.disabled]), [['diff-base:main', 'main', undefined], ['diff-base-note', 'Loading branches…', true]]);
  const failed = base({ list: [], loaded: true, error: true });
  assert.equal(failed.searchPending, false);
  assert.equal(failed.searchEmptyLabel, 'Couldn’t load branches');
  assert.equal(failed.items.at(-1).label, 'Couldn’t load branches');
  const loaded = base({ list: ['alpha'], loaded: true, error: false });
  assert.equal(loaded.searchEmptyLabel, 'No branches match');
  assert.deepEqual(loaded.items.map((row) => row.value), ['diff-base:main', 'diff-base:alpha']);
  // Element labels for the rows the original draws as elements, so K's string filter skips them.
  const cds = diffScopeMenuSections(model.diffScopeSections({ base: 'main', defaultBase: 'main', branches: { list: [], loaded: false },
    commits: Array.from({ length: 51 }, (_, index) => ({ sha: String(index).padStart(40, 'a'), shortSha: 'a'.repeat(7), subject: `Commit ${index}` })) }));
  const note = cds[1].items[0].items.at(-1);
  assert.equal(renderToStaticMarkup(note.label), '<span class="animate-placeholder-reveal">Loading branches…</span>');
  assert.equal(typeof note.label, 'object');
  assert.equal('note' in note || 'searchable' in note, false);
  const more = cds[2].items[0].items.at(-1);
  assert.equal(more.value, 'more-commits');
  assert.equal(renderToStaticMarkup(more.label), '1 older commit not shown');
  assert.equal(typeof cds[2].items[0].items[0].label, 'string');
});

test('YS kc (c5da7eb42 Zf, W12 diff-cont): a detached HEAD\'s own branch value reads "HEAD" in Compare against', async () => {
  const tile = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of ['label:kc(a,e)', 't=kc(a,o)', 'xa as kc']) assert.ok(tile.includes(text), `cccc2cf0a: ${text}`);
  assert.match(tile, /import\{[^}]*xa as kc[^}]*\}from"\.\/c5da7eb42-XijZdwf1\.js"/);
  const repos = official('c5da7eb42-XijZdwf1.js');
  assert.ok(repos.includes('function Zf(e,t){return e?.detachedHead&&t===e.branch?"HEAD":t}'));
  assert.ok(repos.includes('Zf as xa'));
  // The official detached repo's branch is git's pseudo-branch (shared-11 cm); the host's git-status gives the short sha.
  assert.ok(official('shared-11-_AVGLHEz.js').includes('function cm(e){return e==="HEAD"||e.startsWith("detached:")}'));
  assert.match(source('electron/git-status.cjs'), /branch: branch \|\| ctx\.head\?\.slice\(0, 7\) \|\| null, detached: !branch,/);
  const { scopeBranchLabel } = await ssr('/src/generated/files-changes/diff-scope-base-label.mjs');
  assert.equal(scopeBranchLabel({ detachedHead: true, branch: 'abc1234' }, 'abc1234'), 'HEAD');
  assert.equal(scopeBranchLabel({ detachedHead: true, branch: 'abc1234' }, 'main'), 'main');
  assert.equal(scopeBranchLabel({ branch: 'abc1234' }, 'abc1234'), 'abc1234');
  assert.equal(scopeBranchLabel(undefined, 'main'), 'main');
  const model = await ssr('/src/diff-scope-model.mjs');
  const repo = { detachedHead: true, branch: 'abc1234' };
  const compare = model.diffScopeSections({ base: 'abc1234', defaultBase: 'main', overridden: true, repo, branches: { list: ['abc1234', 'topic'], loaded: true } })[1].items[0];
  assert.equal(compare.hint, 'HEAD');
  assert.deepEqual(compare.items.map((row) => [row.value, row.label, row.checked]),
    [['diff-base:main', 'main', false], ['diff-base:abc1234', 'HEAD', true], ['diff-base:topic', 'topic', false]]);
  assert.equal(model.diffScopeSections({ base: 'abc1234', branches: { list: ['abc1234'], loaded: true } })[1].items[0].items[0].label, 'abc1234', 'attached: names stay');
  // useDiffScope hands the host status to YS's `a`.
  const jsx = source('src/source-diff-scope.jsx');
  assert.match(jsx, /const detachedBranch = status\?\.detached \? status\.branch \|\| undefined : undefined;/);
  assert.match(jsx, /\{ detachedHead: true, branch: detachedBranch \}/);
  assert.match(jsx, /branches: branchState, repo,/);
  // The trigger's base is kc'd too (cb61be3a2 ut `base: jt`, `jt = G ? … : lt`, `lt = Te(v, C)`, `xa as Te`), and a
  // detached repo with nothing resolved falls back to its own branch (c5da7eb42), which git-status.cjs now reports.
  const nv = official('cb61be3a2-TL7PL04A.js');
  for (const text of ['xa as Te', 'lt=J2($,26,C,v)?K2($,26,C,v,Te(v,C)):$[28]', 'base:jt,', 'jt=G?G.source.kind==="branch"?C??G.source.baseBranch:Ot:lt'])
    assert.ok(nv.includes(text), `cb61be3a2: ${text}`);
  assert.ok(repos.includes('f={repo:"",branch:t.branch,baseBranch:t.defaultBranch??i?.sourceBranch??t.branch,'));
  assert.ok(repos.includes('remote:s,detachedHead:!0}'));
  assert.deepEqual(model.diffScopeTrigger({ kind: 'branch' }, { base: 'abc1234', repo }).range, { base: 'HEAD', head: 'working tree' });
  assert.equal(model.diffScopeSections({ base: 'abc1234', repo })[0].items[0].hint, 'vs HEAD');
  assert.match(jsx, /diffScopeTrigger\(scope, \{ base, commits: commitList, repo \}\)/);
  assert.match(source('electron/git-status.cjs'), /scopeBase: scope\.baseRef \? scope\.base : !branch && ctx\.head \? ctx\.head\.slice\(0, 7\) : null,/);
});
