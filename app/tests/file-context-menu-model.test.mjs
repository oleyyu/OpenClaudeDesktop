import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FILE_MENU_LABELS, fileContextMenu, fileCopyChoices, fileLinkLabel } from '../src/file-context-menu-model.mjs';

// Mn (c856385e2-k3utJqnh.js :962-1060), Gg/Kg (panes-tile-current.js:6030-6085), l_ (:6809-6862), Rg (:5572-5588).
const shape = (entries) => entries.map((entry) => entry.kind === 'separator' ? '---'
  : entry.kind === 'submenu' ? [entry.label, entry.items.map((item) => item.label)] : entry.label);

test('file_browser: Attach as context, Copy ▸ (Absolute path, Relative path, Filename), separator, Show in Finder', () => {
  const entries = fileContextMenu({ surface: 'file_browser', root: '/work/space', path: 'src/app.js', canAttach: true, canShowInFinder: true });
  assert.deepEqual(shape(entries), ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Show in Finder']);
  const copy = entries[1].items;
  assert.deepEqual(copy.map((item) => item.value), ['/work/space/src/app.js', 'src/app.js', 'app.js']);
  assert.equal(entries.at(-1).value, '/work/space/src/app.js');
  assert.ok(!entries.some((entry) => entry.label === FILE_MENU_LABELS.revealInTree), 'no Reveal in file tree in the tree');
});

test('no Attach as context without a composer; no Show in Finder without the reveal target', () => {
  assert.deepEqual(shape(fileContextMenu({ surface: 'file_browser', root: '/w', path: 'a.txt' })), [['Copy', ['Absolute path', 'Relative path', 'Filename']]]);
  assert.deepEqual(shape(fileContextMenu({ surface: 'file_browser', root: '/w', path: 'a.txt', canShowInFinder: true })), [['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Show in Finder']);
});

test('file_tab adds the Reveal in file tree section after the file items', () => {
  const entries = fileContextMenu({ surface: 'file_tab', root: '/w', path: 'nested/deep.txt', canAttach: true, canShowInFinder: true, canRevealInTree: true });
  assert.deepEqual(shape(entries), ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Show in Finder', '---', 'Reveal in file tree']);
  assert.equal(entries.at(-1).action, 'reveal-in-tree');
  assert.equal(entries.at(-1).value, 'nested/deep.txt');
  // A missing tab (canRevealInTree false) and a path outside the working directory have no reveal.
  assert.deepEqual(shape(fileContextMenu({ surface: 'file_tab', root: '/w', path: 'x.txt' })), [['Copy', ['Absolute path', 'Relative path', 'Filename']]]);
  const outside = fileContextMenu({ surface: 'file_tab', root: '/w', path: '/etc/hosts', canRevealInTree: true });
  assert.deepEqual(shape(outside), [['Copy', ['Absolute path', 'Filename']]], 'an absolute outside path has no Relative path and no reveal');
});

test('copy choices are cwd-relative inside the workspace and strip control characters', () => {
  assert.deepEqual(fileCopyChoices('/w', '/w/src/a.ts'), { absolute: '/w/src/a.ts', relative: 'src/a.ts', filename: 'a.ts' });
  assert.deepEqual(fileCopyChoices('/w/', 'a.ts'), { absolute: '/w/a.ts', relative: 'a.ts', filename: 'a.ts' });
  assert.deepEqual(fileCopyChoices('/w', 'dir/'), { absolute: '/w/dir', relative: 'dir/', filename: 'dir' });
  const entries = fileContextMenu({ root: '/w', path: 'a‮b.txt' });
  assert.equal(entries[0].items[1].value, 'ab.txt');
});

test('link labels (Rg)', () => {
  assert.equal(fileLinkLabel({ target: '../lib', state: 'ok' }), 'Link to ../lib');
  assert.equal(fileLinkLabel({ target: '/opt/x', state: 'external' }), 'Link to /opt/x, outside the working directory');
  assert.equal(fileLinkLabel({ target: 'gone', state: 'dangling' }), 'Broken link to gone');
  assert.equal(fileLinkLabel({ target: 'loop', state: 'cycle' }), 'Circular link to loop');
  assert.equal(fileLinkLabel({ target: '', state: 'ok' }), 'Symbolic link');
});

test('source multi-file menu snapshots visual order, sanitizes each copied path, and bounds only attachment/editor actions', async()=>{
 const {multiFileContextMenu,fileMenuSelection}=await import('../src/file-context-menu-model.mjs');
 const matches=[{path:'a.txt'},{path:'b.txt'},{path:'c.txt'}];
 assert.deepEqual(fileMenuSelection(matches,new Set(['c.txt','a.txt']),'a.txt'),['a.txt','c.txt']);
 assert.deepEqual(fileMenuSelection(matches,new Set(['c.txt','a.txt']),'b.txt'),['b.txt']);
 const editors=[{type:'vscode',name:'VS Code'}];
 const menu=multiFileContextMenu({root:'/repo',paths:['a\n.txt','nested/b.txt'],canAttach:true,editors});
 assert.deepEqual(menu.map(e=>e.kind==='item'?e.action:e.kind),['attach-many','submenu','separator','submenu']);
 assert.deepEqual(menu[0].paths,['/repo/a\n.txt','/repo/nested/b.txt']);
 assert.deepEqual(menu[1].items.map(e=>e.value),['/repo/a.txt\n/repo/nested/b.txt','a.txt\nnested/b.txt','a.txt\nb.txt']);
 assert.equal(menu[3].items[0].action,'open-many-in-editor');
 for(const count of [100,101]){
  const many=multiFileContextMenu({root:'/repo',paths:Array.from({length:count},(_,i)=>`${i}.txt`),canAttach:true,editors});
  assert.equal(!!many[0].disabled,count>100);assert.equal(!!many[3].items[0].disabled,count>100);
  assert.ok(many[1].items.every(e=>!e.disabled));
  if(count>100)assert.equal(many[0].description,'Up to 100 items at a time');
 }
 assert.equal(multiFileContextMenu({root:'/repo',paths:['a.txt','b.txt']})[0].kind,'submenu');
});


test('original editor eligibility excludes binary/media paths while retaining text, SVG and directories', async()=>{
 const {multiFileContextMenu,fileContextMenu}=await import('../src/file-context-menu-model.mjs');
 // R3-files FT-05: the menus read the 2.42304.0 rule (shared-28 Fk over shared-104 bP), same answers as the 2.31226.0 one.
 const {canOpenFileInEditor}=await import('../src/generated/files-changes/file-editor-path.mjs');
 const {canOpenFileInEditor:previous}=await import('../src/generated/code-editor/file-editor-path.mjs');
 for(const path of ['photo.PNG','pic.avif','vector.svg','clip.mp4','archive.tar.gz','book.pdf','doc.docx','icon.ico','db.sqlite3','font.woff2','lib.so.2','app.ts','Makefile','file.unknown','.env','dir/'])assert.equal(canOpenFileInEditor(path),previous(path),path);
 const source=fs.readFileSync(new URL('../src/file-context-menu-model.mjs',import.meta.url),'utf8');
 assert.match(source,/import \{ canOpenFileInEditor \} from "\.\/generated\/files-changes\/file-editor-path\.mjs";/);
 assert.doesNotMatch(source,/generated\/code-editor\/file-editor-path/);
 const editors=[{type:'vscode',name:'VS Code'}];
 for(const path of ['photo.PNG','clip.mp4','archive.tar.gz','book.pdf','doc.docx','icon.ico','db.sqlite3','font.woff2','lib.so.2'])assert.equal(canOpenFileInEditor(path),false,path);
 for(const path of ['app.ts','Makefile','icon.svg','file.unknown'])assert.equal(canOpenFileInEditor(path),true,path);
 const menu=multiFileContextMenu({root:'/repo',paths:['photo.png','app.ts','book.pdf'],canAttach:true,editors});
 assert.equal(menu[0].paths.length,3);assert.deepEqual(menu.at(-1).items[0].paths,['/repo/app.ts']);
 assert.equal(multiFileContextMenu({root:'/repo',paths:['photo.png','book.pdf'],editors}).length,1);
 assert.equal(fileContextMenu({root:'/repo',path:'photo.png',editors}).length,1);
 assert.equal(fileContextMenu({root:'/repo',path:'assets.png',directory:true,editors}).at(-1).label,'Open in');
});

// 2.31226.0 c219730b0 Gt (:534-566) + cccc2cf0a renderFileMenuItems (c856385e2 cn/rn/tn :1122-1133, :1050-1082, :965-1049).
import { changedFileMenu } from '../src/file-context-menu-model.mjs';
test('Changes file menu: Attach, Copy, separator + Open file, then Open in ▸ editors and Show in Finder without a separator', () => {
  const editors = [{ name: 'VS Code', type: 'vscode' }, { name: 'Zed', type: 'zed' }];
  const entries = changedFileMenu({ root: '/repo', path: 'src/app.js', canAttach: true, canOpenFile: true, editors, canShowInFinder: true });
  assert.deepEqual(shape(entries), ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Open file', ['Open in', ['VS Code', 'Zed']], 'Show in Finder']);
  assert.deepEqual(entries[1].items.map((item) => item.value), ['/repo/src/app.js', 'src/app.js', 'app.js']);
  assert.deepEqual(entries[3], { kind: 'item', action: 'open-file', label: 'Open file', value: 'src/app.js' });
  assert.deepEqual(entries[4].items[1], { kind: 'item', action: 'open-in-editor', label: 'Zed', value: '/repo/src/app.js', editor: 'zed' });
  assert.deepEqual(entries[5], { kind: 'item', action: 'show-in-finder', label: 'Show in Finder', value: '/repo/src/app.js' });
});
test('Changes file menu: without Open file the renderFileMenuItems group starts with a separator; nothing to add, no separator', () => {
  assert.deepEqual(shape(changedFileMenu({ root: '/repo', path: 'src', canAttach: true, editors: [{ name: 'Zed', type: 'zed' }], canShowInFinder: true })),
    ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', ['Open in', ['Zed']], 'Show in Finder']);
  assert.deepEqual(shape(changedFileMenu({ root: '/repo', path: 'a.txt', canShowInFinder: true })), [['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Show in Finder']);
  assert.deepEqual(shape(changedFileMenu({ root: '/repo', path: 'a.txt', canOpenFile: true })), [['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Open file']);
  // No resolvable root: no Absolute path, no Open in, no Show in Finder.
  assert.deepEqual(shape(changedFileMenu({ root: null, path: 'a.txt', editors: [{ name: 'Zed', type: 'zed' }], canShowInFinder: true })), [['Copy', ['Relative path', 'Filename']]]);
  // An editor cannot open an image: Open in is left out (Ut he()).
  assert.deepEqual(shape(changedFileMenu({ root: '/repo', path: 'logo.png', canOpenFile: true, editors: [{ name: 'Zed', type: 'zed' }] })), [['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Open file']);
});

// B13 im (2.31226.0 cd2efac6e readable :5945-6030, the no-selection branch): a preview body's menu is the
// file_viewer items (no Reveal in file tree, no Open in terminal), then Copy file contents and Download file.
test('file_viewer body menu: file items, separator, Copy file contents, Download file', async () => {
  const { fileViewerMenu, FILE_MENU_SURFACES } = await import('../src/file-context-menu-model.mjs');
  assert.ok(FILE_MENU_SURFACES.includes('file_viewer'));
  const items = fileContextMenu({ surface: 'file_viewer', root: '/w', path: 'docs/README.md', canAttach: true, canShowInFinder: true, canRevealInTree: true,
    editors: [{ name: 'VS Code', type: 'vscode' }] });
  const menu = fileViewerMenu(items, { canCopyContents: true, canDownload: true });
  assert.deepEqual(shape(menu), ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', ['Open in', ['VS Code']], 'Show in Finder', '---', 'Copy file contents', 'Download file']);
  assert.deepEqual(menu.slice(-2).map((entry) => entry.action), ['copy-file-contents', 'download-file']);
  // Media and unavailable cards have no loaded text: the file items only.
  assert.deepEqual(shape(fileViewerMenu(items, {})), shape(items));
  assert.deepEqual(shape(fileViewerMenu([], { canCopyContents: true })), ['Copy file contents'], 'no leading separator');
});

// B32 ko (cd2efac6e readable :1354-1400) over Jt (c856385e2 :644-720) and Zt (:829-860).
test('B32 file_breadcrumb: a folder segment ends with Open in terminal, then Reveal in file tree as "dir/"', async () => {
  const { breadcrumbSegmentTargets, FILE_MENU_SURFACES } = await import('../src/file-context-menu-model.mjs');
  assert.ok(FILE_MENU_SURFACES.includes('file_breadcrumb'));
  const editors = [{ name: 'VS Code', type: 'vscode' }];
  const folder = fileContextMenu({ surface: 'file_breadcrumb', root: '/work/space', path: 'src/lib', directory: true, canAttach: true,
    canShowInFinder: true, canRevealInTree: true, editors, canOpenTerminal: true });
  assert.deepEqual(shape(folder), ['Attach as context', ['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', ['Open in', ['VS Code']],
    'Show in Finder', '---', 'Open in terminal', '---', 'Reveal in file tree']);
  assert.deepEqual(folder.at(-1), { kind: 'item', action: 'reveal-in-tree', label: 'Reveal in file tree', value: 'src/lib/' });
  assert.equal(folder.at(-3).value, '/work/space/src/lib');
  const file = fileContextMenu({ surface: 'file_breadcrumb', root: '/work/space', path: 'src/lib/a.js', canShowInFinder: true, canRevealInTree: true, canOpenTerminal: true });
  assert.deepEqual(shape(file), [['Copy', ['Absolute path', 'Relative path', 'Filename']], '---', 'Show in Finder', '---', 'Reveal in file tree']);
  assert.equal(file.at(-1).value, 'src/lib/a.js');
  const outside = fileContextMenu({ surface: 'file_breadcrumb', root: '/work/space', path: '/etc', directory: true, canRevealInTree: true });
  assert.deepEqual(shape(outside), [['Copy', ['Absolute path', 'Filename']]], 'no relative path, no tree item outside the root');
  assert.deepEqual(shape(fileContextMenu({ surface: 'file_tab', root: '/w', path: 'd', directory: true, canOpenTerminal: true })), [['Copy', ['Absolute path', 'Relative path', 'Filename']]],
    'other surfaces are unchanged');
  // Zs/qs: the segment targets.
  assert.deepEqual(breadcrumbSegmentTargets('src/lib/a.js'), {
    dirs: [{ label: 'src', path: 'src', directory: true, outside: false }, { label: 'lib', path: 'src/lib', directory: true, outside: false }],
    name: { label: 'a.js', path: 'src/lib/a.js', directory: false, outside: false } });
  assert.deepEqual(breadcrumbSegmentTargets('/etc/hosts').dirs, [{ label: 'etc', path: '/etc', directory: true, outside: true }]);
  assert.deepEqual(breadcrumbSegmentTargets('~/notes.md'), { dirs: [], name: null }, 'a "~" path is not absolute: no menu');
});

// R3-files FT-05 (files-11 / files-v01): 2.42304.0 c856385e2 xn — `d = n.openIn !== false && n.gone !== true` gates gn
// (the "Open in" submenu and the reveal item) and wn (a folder's "Open in terminal"), so a gone path keeps Attach and Copy.
test('gone: no Open in, Show in Finder or Open in terminal; Attach and Copy stay', () => {
  const editors = [{ type: 'vscode', name: 'VS Code' }];
  const live = fileContextMenu({ root: '/repo', path: 'src/app.ts', canAttach: true, canShowInFinder: true, editors });
  assert.deepEqual(live.map((entry) => entry.kind === 'separator' ? '-' : entry.label), ['Attach as context', 'Copy', '-', 'Open in', 'Show in Finder']);
  const gone = fileContextMenu({ root: '/repo', path: 'src/app.ts', canAttach: true, canShowInFinder: true, editors, gone: true });
  assert.deepEqual(gone.map((entry) => entry.label), ['Attach as context', 'Copy']);
  assert.deepEqual(gone[1].items.map((item) => item.label), ['Absolute path', 'Relative path', 'Filename']);
  const folder = fileContextMenu({ root: '/repo', path: 'src', directory: true, canAttach: true, canShowInFinder: true, editors, canOpenTerminal: true });
  assert.equal(folder.at(-1).action, 'open-in-terminal');
  const goneFolder = fileContextMenu({ root: '/repo', path: 'src', directory: true, canAttach: true, canShowInFinder: true, editors, canOpenTerminal: true, gone: true });
  assert.deepEqual(goneFolder.map((entry) => entry.label), ['Attach as context', 'Copy']);
  // A tab keeps its own "Reveal in file tree" section (cccc2cf0a's tab menu has no gone check; it hides on "missing").
  const tab = fileContextMenu({ surface: 'file_tab', root: '/repo', path: 'src/app.ts', canRevealInTree: true, editors, gone: true });
  assert.equal(tab.at(-1).action, 'reveal-in-tree');
  assert.deepEqual(fileContextMenu({ root: '/repo', path: 'a.ts', editors, gone: false }), fileContextMenu({ root: '/repo', path: 'a.ts', editors }));
});

// R3-files FT-06 (files-v01): a breadcrumb segment (cd2efac6e Ps over cfac349aa Jt's gone answer) also drops its
// "Reveal in file tree" section (`x = !h && …`) and a folder's "Open in terminal", keeping Attach and Copy.
test('gone breadcrumb segment: no Open in, Show in Finder, Open in terminal or Reveal in file tree', () => {
  const editors = [{ type: 'vscode', name: 'VS Code' }];
  const live = fileContextMenu({ surface: 'file_breadcrumb', root: '/repo', path: 'src', directory: true, canAttach: true, canShowInFinder: true, canRevealInTree: true, editors, canOpenTerminal: true });
  assert.deepEqual(live.filter((entry) => entry.kind !== 'separator').map((entry) => entry.label), ['Attach as context', 'Copy', 'Open in', 'Show in Finder', 'Open in terminal', 'Reveal in file tree']);
  const gone = fileContextMenu({ surface: 'file_breadcrumb', root: '/repo', path: 'src', directory: true, canAttach: true, canShowInFinder: true, canRevealInTree: true, editors, canOpenTerminal: true, gone: true });
  assert.deepEqual(gone.map((entry) => entry.label), ['Attach as context', 'Copy']);
  const file = fileContextMenu({ surface: 'file_breadcrumb', root: '/repo', path: 'src/a.ts', canRevealInTree: true, editors, gone: true });
  assert.deepEqual(file.map((entry) => entry.label), ['Copy']);
});
