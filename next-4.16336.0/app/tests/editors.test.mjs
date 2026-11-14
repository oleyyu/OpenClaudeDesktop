import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { installedEditors, openInEditor, editorApp, EDITORS } = require('../electron/editors.cjs');

test('installed editors come from app bundles in /Applications or ~/Applications, sorted by name, without Xcode', () => {
  const present = new Set(['/Applications/Visual Studio Code.app', '/home/me/Applications/JetBrains Toolbox/WebStorm.app', '/Applications/Cursor.app', '/Applications/Xcode.app']);
  const list = installedEditors({ home: '/home/me', exists: (file) => present.has(file) });
  assert.deepEqual(list, [{ type: 'cursor', name: 'Cursor' }, { type: 'vscode', name: 'VS Code' }, { type: 'webstorm', name: 'WebStorm' }]);
  assert.ok(!EDITORS.some((editor) => /xcode/i.test(editor.type)));
  assert.equal(editorApp(EDITORS.find((e) => e.type === 'zed'), { home: '/h', exists: () => false }), null);
});

test('openInEditor runs open -a with the app bundle; it refuses unknown editors, relative or missing paths, and uninstalled apps', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'editors-'));
  const calls = [];
  const run = (file, args, options, done) => { calls.push([file, args]); done(null); };
  const exists = (file) => file === '/Applications/Zed.app';
  assert.equal(await openInEditor(dir, 'zed', { exists, run }), true);
  assert.deepEqual(calls, [['/usr/bin/open', ['-a', '/Applications/Zed.app', dir]]]);
  await assert.rejects(openInEditor(dir, 'notepad', { exists, run }), /Unknown editor/);
  await assert.rejects(openInEditor('relative/path', 'zed', { exists, run }), /Invalid file path/);
  await assert.rejects(openInEditor(path.join(dir, 'missing'), 'zed', { exists, run }), /no longer exists/);
  await assert.rejects(openInEditor(dir, 'cursor', { exists, run }), /no longer installed/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the Files pane menu gets an Open in submenu of the editors, and Show in Finder loses its own separator', async () => {
  const { fileContextMenu } = await import('../src/file-context-menu-model.mjs');
  const editors = [{ type: 'cursor', name: 'Cursor' }, { type: 'vscode', name: 'VS Code' }];
  const entries = fileContextMenu({ root: '/repo', path: 'src/a.js', canShowInFinder: true, editors });
  const kinds = entries.map((entry) => entry.kind === 'submenu' ? `submenu:${entry.label}` : entry.kind === 'item' ? entry.action : entry.kind);
  assert.deepEqual(kinds, ['submenu:Copy', 'separator', 'submenu:Open in', 'show-in-finder']);
  assert.deepEqual(entries[2].items, [
    { kind: 'item', action: 'open-in-editor', label: 'Cursor', value: '/repo/src/a.js', editor: 'cursor' },
    { kind: 'item', action: 'open-in-editor', label: 'VS Code', value: '/repo/src/a.js', editor: 'vscode' },
  ]);
  const plain = fileContextMenu({ root: '/repo', path: 'src/a.js', canShowInFinder: true });
  assert.deepEqual(plain.map((entry) => entry.kind), ['submenu', 'separator', 'item']);
});

test('content-hit menu carries only positive integer file line positions', async () => {
  const {fileContextMenu}=await import('../src/file-context-menu-model.mjs');
  const item=(options={})=>fileContextMenu({root:'/repo',path:'a.js',editors:[{type:'vscode',name:'VS Code'}],...options}).find(e=>e.label==='Open in').items[0];
  assert.equal(item({line:37}).line,37);
  for(const line of [undefined,null,0,-1,2.5,'3',NaN,Infinity])assert.equal(item({line}).line,undefined);
  assert.equal(item({line:37,directory:true}).line,undefined);
});

test('source URI encoder preserves paths and positive integer positions for every supported editor', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editor-location-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'中文 #?% &:17.txt');fs.writeFileSync(file,'first\nsecond\n');
  const schemes={vscode:'vscode',vscodeInsiders:'vscode-insiders',cursor:'cursor',windsurf:'windsurf',zed:'zed'};
  const encoded=file.split('/').map(encodeURIComponent).join('/');
  for(const [type,scheme] of Object.entries(schemes)){
    const calls=[];
    await openInEditor(file,type,{exists:()=>true,line:17,column:3,run:()=>assert.fail('must use line-aware URI'),openExternal:async uri=>calls.push(uri)});
    assert.deepEqual(calls,[`${scheme}://file/${encoded}:17:3`]);
  }
  const calls=[];const openExternal=async uri=>calls.push(uri);
  await openInEditor(file,'vscode',{exists:()=>true,line:2,column:0,openExternal});
  assert.deepEqual(calls,[`vscode://file/${encoded}:2`]);
  await assert.rejects(openInEditor(file,'vscode',{exists:()=>true,line:2,openExternal:async()=>{throw Error('launch failed');}}),/launch failed/);
  for(const target of [path.join(dir,'missing'),'relative'])await assert.rejects(openInEditor(target,'vscode',{exists:()=>true,line:2,openExternal:()=>assert.fail('must validate path first')}));
});

test('ordinary opens, folders, invalid lines and additional editors retain app-bundle launch', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editor-fallback-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'file.txt');fs.writeFileSync(file,'hello');
  const calls=[],run=(cmd,args,opts,done)=>{calls.push([cmd,args]);done(null);};
  const options={exists:()=>true,run,openExternal:()=>assert.fail('not a line-aware file open')};
  for(const line of [undefined,0,-1,1.5,'2',Infinity])await openInEditor(file,'vscode',{...options,line});
  await openInEditor(dir,'vscode',{...options,line:4});
  await openInEditor(file,'sublime',{...options,line:4});
  assert.equal(calls.length,8);assert.ok(calls.every(([cmd,args])=>cmd==='/usr/bin/open'&&args[0]==='-a'));
  assert.equal(calls[6][1].at(-1),dir);assert.equal(calls[7][1][1],'/Applications/Sublime Text.app');
});
