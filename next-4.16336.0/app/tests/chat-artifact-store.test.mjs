import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { createChatArtifactStore, chatArtifactRequest, chatLibraryRecords, printDocument, STORE_DIR } from '../electron/chat-artifact-store.mjs';
import { ARTIFACT_TYPES, CODE_EXTENSIONS, artifactActions, artifactExtension, artifactReadFailure, artifactRenderer, artifactToolCall, artifactType, artifactVersionRows,
  chatArtifactKey, knowledgeFileName, parseChatArtifactKey, withArtifactChips } from '../src/chat-artifact-model.mjs';

// w13-chatfn-artifacts (research/w13-chatfn.md A1, A2, A4, chatfn-26/28/30/31): the local store, its IPC and the pure model.
const official = (prefix) => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'chat-artifacts-'));
const clock = () => { let at = 1_000; return () => (at += 1); };

test('3.6556.2 original: the artifact types, the extension table and the panel copy', () => {
  const s104 = official('shared-104-');
  assert.ok(s104.includes('e.Text="text/plain",e.Markdown="text/markdown",e.Html="text/html",e.Code="application/vnd.ant.code",e.Svg="image/svg+xml",e.Mermaid="application/vnd.ant.mermaid",e.React="application/vnd.ant.react"'));
  assert.ok(s104.includes('[Q.Mermaid]:{syntaxName:`mermaid`,extension:()=>`mermaid`}') || s104.includes('[Q.Mermaid]:{syntaxName:"mermaid",extension:()=>"mermaid"}') || /\[\w+\.Mermaid\]:\{syntaxName:"mermaid",extension:\(\)=>"mermaid"\}/.test(s104));
  assert.match(s104, /\[\w+\.React\]:\{syntaxName:"tsx",extension:\(\)=>"tsx"\}/);
  // Every language case of HI's Code switch, in the model's table.
  const cases = [...s104.matchAll(/case"([a-z]+)":return"([a-z]+)"/g)].map(([, language, ext]) => [language, ext]);
  for (const [language, ext] of Object.entries(CODE_EXTENSIONS)) assert.ok(cases.some(([l, e]) => l === language && e === ext), language);
  assert.equal(Object.keys(CODE_EXTENSIONS).length, 27);
  assert.deepEqual(Object.values(ARTIFACT_TYPES), ['text/plain', 'text/markdown', 'text/html', 'application/vnd.ant.code', 'image/svg+xml', 'application/vnd.ant.mermaid', 'application/vnd.ant.react']);
  const ca2 = official('ca2ef848d-');
  for (const message of ['"Download as {ext}"', '"Copy as image"', '"Add to project"', '"Print as PDF"', '"Error saving as PDF"', '"File added to project"', '"Error adding file to project"', '"Couldn’t copy image"'])
    assert.ok(ca2.includes(`defaultMessage:${message}`) || ca2.includes(`defaultMessage:${message.replace('’', '\\u2019')}`), message);
  assert.ok(ca2.includes('values:{ext:') && ca2.includes('.toUpperCase()'));
  const frame = official('frame-shell-header-');
  assert.ok(frame.includes('versionOrdinal:{defaultMessage:"Version {n}"'));
  assert.ok(frame.includes('"Version history, {count, plural, one {# version} other {# versions}}"'));
});

test('model: types, extensions, renderers, the split button items and the version rows', () => {
  assert.equal(artifactType('application/x-unknown'), ARTIFACT_TYPES.Text);
  // shared-104 HI switches on the language as given: "Python" is not "python" (w13-close-main-process).
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.Code, language: 'Python' }), 'txt');
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.Code, language: 'python' }), 'py');
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.Code, language: 'constructor' }), 'txt');
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.Code, language: 'cobol' }), 'txt');
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.React }), 'tsx');
  assert.equal(artifactExtension({ type: ARTIFACT_TYPES.Mermaid }), 'mermaid');
  assert.deepEqual(artifactRenderer({ type: ARTIFACT_TYPES.Html }), { kind: 'html', preview: true, sandbox: 'allow-scripts' });
  assert.deepEqual(artifactRenderer({ type: ARTIFACT_TYPES.React }), { kind: 'code', preview: false, codeOnly: 'react' });
  assert.deepEqual(artifactRenderer({ type: ARTIFACT_TYPES.Mermaid }), { kind: 'code', preview: false, codeOnly: 'mermaid' });
  const ids = (artifact, options) => artifactActions(artifact, options).map((row) => row.id);
  // ca2ef848d order: download, copyAsImage (svg), addToProject (in a project), downloadAsPdf (markdown / plaintext).
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Markdown }), ['download', 'downloadAsPdf']);
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Markdown }, { inProject: true }), ['download', 'addToProject', 'downloadAsPdf']);
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Svg, content: '<svg width="2" height="2"></svg>' }), ['download', 'copyAsImage']);
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Svg, content: '<svg><foreignObject></foreignObject></svg>' }), ['download']);
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Html }), ['download']);
  assert.deepEqual(ids({ type: ARTIFACT_TYPES.Code, language: 'go' }), ['download', 'downloadAsPdf']);
  assert.deepEqual(artifactActions({ type: ARTIFACT_TYPES.Code, language: 'go' })[0], { id: 'download', message: 'Download as {ext}', values: { ext: 'GO' } });
  assert.ok(artifactActions({}).every((row) => !/Publish|Share/.test(row.message)), 'Publish / Share need claude.ai (E59)');
  assert.deepEqual(artifactVersionRows([{ n: 1 }, { n: 2 }, { n: 3 }], 2).map(({ n, current, latest }) => [n, current, latest]), [[3, false, true], [2, true, false], [1, false, false]]);
  assert.deepEqual(artifactVersionRows([{ n: 1 }])[0], { n: 1, current: true, latest: true, message: 'Version {n}', values: { n: 1 } });
  assert.equal(chatArtifactKey('thr-1', 'doc'), 'chat:thr-1:doc');
  assert.deepEqual(parseChatArtifactKey('chat:thr:1:doc'), { threadId: 'thr:1', id: 'doc' });
  assert.equal(parseChatArtifactKey('["t","/p"]'), null);
  // ca2ef848d j2(text, cS(t.path), …): the artifact's text under its file name.
  assert.equal(knowledgeFileName({ id: 'plan', title: 'Plan / v2', type: ARTIFACT_TYPES.Markdown }), 'plan.md');
  assert.equal(knowledgeFileName({ id: 'a', type: ARTIFACT_TYPES.Code, language: 'python' }), 'a.py');
});

test('model: the transcript chip reads an `artifacts` call, and a Chat splits tool groups around it', () => {
  const call = (id, extra = {}) => ({ id: `i-${id}`, type: 'mcpToolCall', server: 'code_desktop', tool: 'artifacts', status: 'completed', arguments: { command: 'create', id }, ...extra });
  assert.deepEqual(artifactToolCall(call('doc')), { id: 'doc', command: 'create', updated: false, failed: false, title: null });
  assert.equal(artifactToolCall(call('doc', { arguments: { command: 'update', id: 'doc' } })).updated, true);
  assert.equal(artifactToolCall(call('doc', { status: 'failed' })).failed, true);
  assert.equal(artifactToolCall({ type: 'mcpToolCall', server: 'other', tool: 'artifacts', arguments: { id: 'x' } }), null);
  assert.equal(artifactToolCall({ type: 'dynamicToolCall', tool: 'code_desktop_artifacts', arguments: '{"id":"x","command":"rewrite"}' }).command, 'rewrite');
  assert.equal(artifactToolCall(call('bad id')), null);
  const other = (id) => ({ id, type: 'webSearch' });
  const group = { ...other('w1'), type: 'fileToolGroup', toolGroup: [other('w1'), other('w2'), call('a'), other('w3'), call('b', { status: 'failed' })] };
  const rows = withArtifactChips([{ id: 'u', type: 'userMessage' }, group]);
  assert.deepEqual(rows.map((row) => [row.id, row.type, row.toolGroup?.map((member) => member.id) ?? null]),
    [['u', 'userMessage', null], ['w1', 'fileToolGroup', ['w1', 'w2']], ['i-a', 'mcpToolCall', null], ['w3', 'fileToolGroup', ['w3', 'i-b']]]);
  const plain = [group.toolGroup[0]];
  assert.equal(withArtifactChips(plain), plain, 'nothing to split: the same array');
});

test('store: create → update → rewrite make versions 1–3; each version keeps its own text, type and extension', async () => {
  const dataDir = tmp();
  const store = createChatArtifactStore({ dataDir, now: clock() });
  const first = await store.apply('thr', { command: 'create', id: 'report', title: 'Report', type: ARTIFACT_TYPES.Markdown, content: '# One\nalpha beta' });
  assert.equal(first.created, true);
  assert.equal(first.artifact.version, 1);
  assert.ok(fs.existsSync(path.join(dataDir, STORE_DIR, 'thr', 'report', 'v1.md')));
  await store.apply('thr', { command: 'update', id: 'report', old_str: 'alpha', new_str: 'gamma' });
  await assert.rejects(store.apply('thr', { command: 'update', id: 'report', old_str: 'missing', new_str: 'x' }), /wasn’t found in artifact “report” \(version 2\)/);
  await store.apply('thr', { command: 'rewrite', id: 'report', content: 'a a' });
  await assert.rejects(store.apply('thr', { command: 'update', id: 'report', old_str: 'a', new_str: 'b' }), /appears 2 times/);
  const latest = await store.read('thr', 'report');
  assert.equal(latest.shown, 3);
  assert.equal(latest.content, 'a a');
  assert.deepEqual(latest.versions.map((row) => [row.n, row.command]), [[1, 'create'], [2, 'update'], [3, 'rewrite']]);
  assert.equal((await store.read('thr', 'report', 2)).content, '# One\ngamma beta');
  // A later create with another type: the old versions keep their files and types.
  await store.apply('thr', { command: 'create', id: 'report', type: ARTIFACT_TYPES.Code, language: 'python', content: 'print(1)' });
  const four = await store.read('thr', 'report');
  assert.equal(four.extension, 'py');
  assert.equal((await store.read('thr', 'report', 1)).extension, 'md');
  assert.equal((await store.read('thr', 'report', 1)).type, ARTIFACT_TYPES.Markdown);
  await assert.rejects(store.read('thr', 'report', 9), /isn’t available/);
  await assert.rejects(store.apply('thr', { command: 'rewrite', id: 'nope', content: 'x' }), /no artifact “nope”/);
  await assert.rejects(store.apply('thr', { command: 'create', id: '../x', content: 'x' }), /id of letters/);
  await assert.rejects(store.apply('../evil', { command: 'create', id: 'x', content: 'x' }), /can’t keep artifacts/);
  await assert.rejects(store.apply('thr', { command: 'delete', id: 'x' }), /create, update or rewrite/);
  // Concurrent writes to one chat are serialized: no version number is lost.
  await Promise.all([1, 2, 3].map((n) => store.apply('thr', { command: 'create', id: 'many', type: ARTIFACT_TYPES.Text, content: `v${n}` })));
  assert.deepEqual((await store.read('thr', 'many')).versions.map((row) => row.n), [1, 2, 3]);
});

test('store: pin, the library rows (c230724a2 "chat" items) and the per-chat delete', async () => {
  const dataDir = tmp();
  const store = createChatArtifactStore({ dataDir, now: clock() });
  await store.apply('a', { command: 'create', id: 'notes', title: 'Notes', type: ARTIFACT_TYPES.Markdown, content: 'x'.repeat(700) });
  await store.apply('b', { command: 'create', id: 'page', type: ARTIFACT_TYPES.Html, content: '<p>hi</p>' });
  await store.pin('a', 'notes', true);
  const rows = chatLibraryRecords(await store.listAll((id) => id !== 'hidden'));
  const notes = rows.find((row) => row.artifactId === 'notes');
  assert.deepEqual({ ...notes, createdAtMs: 0, updatedAtMs: 0 }, { key: 'chat:a:notes', source: 'chat', threadId: 'a', artifactId: 'notes', title: 'Notes', description: '',
    path: 'notes.md', artifactType: ARTIFACT_TYPES.Markdown, previewText: 'x'.repeat(600), starred: true, version: 1, createdAtMs: 0, updatedAtMs: 0 });
  assert.equal(rows.find((row) => row.artifactId === 'page').title, 'page', 'the id stands in for a missing title');
  assert.equal((await store.listAll((id) => id === 'b')).length, 1);
  await store.deleteThread('a');
  assert.equal(fs.existsSync(path.join(dataDir, STORE_DIR, 'a')), false);
  assert.deepEqual((await store.listAll()).map((row) => row.id), ['page']);
});

test('IPC: reads only known Chat threads; export, preview frame, PDF, image and Add to project go through main', async () => {
  const dataDir = tmp();
  const store = createChatArtifactStore({ dataDir, now: clock() });
  await store.apply('chat1', { command: 'create', id: 'doc', title: 'My / Doc', type: ARTIFACT_TYPES.Markdown, content: '# Hi <b>' });
  await store.apply('chat1', { command: 'create', id: 'page', type: ARTIFACT_TYPES.Html, content: '<h1>x</h1>' });
  const out = path.join(dataDir, 'out');
  fs.mkdirSync(out);
  const calls = [];
  const deps = { store, known: (id) => id === 'chat1', projectOf: (id) => (id === 'chat1' ? { id: 'proj' } : null),
    saveDialog: async (options) => { calls.push(['save', options.defaultPath]); return { canceled: false, filePath: path.join(out, options.defaultPath) }; },
    printToPdf: async (html) => { calls.push(['pdf', html]); return Buffer.from('%PDF-1.4'); },
    writeImage: (dataUrl) => calls.push(['image', dataUrl.slice(0, 22)]),
    previewFrames: { register: (request) => { calls.push(['frame', request]); return { url: 'oc-file-preview://t/v1.html' }; } },
    addKnowledgeText: async (projectId, entry) => { calls.push(['knowledge', projectId, entry.name, entry.text]); return { added: [{ name: entry.name }], failed: [] }; } };
  await assert.rejects(chatArtifactRequest({ action: 'read', threadId: 'other', id: 'doc' }, deps), /isn’t available/);
  const read = await chatArtifactRequest({ action: 'read', threadId: 'chat1', id: 'doc' }, deps);
  assert.equal(read.inProject, true);
  assert.equal(read.content, '# Hi <b>');
  assert.equal('file' in read || 'folder' in read, false, 'no store paths reach the renderer');
  assert.deepEqual(await chatArtifactRequest({ action: 'export', threadId: 'chat1', id: 'doc' }, deps), { saved: path.join(out, 'My Doc.md') });
  assert.equal(fs.readFileSync(path.join(out, 'My Doc.md'), 'utf8'), '# Hi <b>');
  await chatArtifactRequest({ action: 'preview-frame', threadId: 'chat1', id: 'page' }, deps);
  const frame = calls.find((row) => row[0] === 'frame')[1];
  assert.equal(frame.root, path.join(dataDir, STORE_DIR, 'chat1', 'page'));
  assert.equal(frame.relative, 'v1.html');
  assert.equal(frame.text, '<h1>x</h1>');
  await chatArtifactRequest({ action: 'print-pdf', threadId: 'chat1', id: 'doc' }, deps);
  const printed = calls.find((row) => row[0] === 'pdf')[1];
  assert.match(printed, /<pre># Hi &lt;b&gt;<\/pre>/);
  assert.match(printed, /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"/);
  assert.match(printDocument({ title: 'T', html: '<h1>Rendered</h1>' }), /<body><h1>Rendered<\/h1><\/body>/);
  assert.equal(fs.readFileSync(path.join(out, 'My Doc.pdf'), 'utf8'), '%PDF-1.4');
  await assert.rejects(chatArtifactRequest({ action: 'copy-image', threadId: 'chat1', id: 'doc', dataUrl: 'javascript:alert(1)' }, deps), /Couldn’t copy image/);
  assert.deepEqual(await chatArtifactRequest({ action: 'copy-image', threadId: 'chat1', id: 'doc', dataUrl: 'data:image/png;base64,AAAA' }, deps), { copied: true });
  const added = await chatArtifactRequest({ action: 'add-to-project', threadId: 'chat1', id: 'doc' }, deps);
  assert.equal(added.added.length, 1);
  assert.deepEqual(calls.find((row) => row[0] === 'knowledge'), ['knowledge', 'proj', 'doc.md', '# Hi <b>']);
  await assert.rejects(chatArtifactRequest({ action: 'add-to-project', threadId: 'chat1', id: 'doc' }, { ...deps, projectOf: () => null }), /isn’t in a project/);
  const canceled = await chatArtifactRequest({ action: 'export', threadId: 'chat1', id: 'doc' }, { ...deps, saveDialog: async () => ({ canceled: true }) });
  assert.deepEqual(canceled, { canceled: true });
  await assert.rejects(chatArtifactRequest({ action: 'nope', threadId: 'chat1' }, deps), /Unknown artifact operation/);
});

test('Add to project: the artifact’s text joins the project knowledge through addKnowledgeText (no dialog, no temp file)', async () => {
  const { addKnowledgeText, listKnowledge, readKnowledgeTexts, knowledgeDir } = await import('../electron/project-knowledge.mjs');
  const dataDir = tmp();
  const store = createChatArtifactStore({ dataDir, now: clock() });
  await store.apply('chat1', { command: 'create', id: 'notes', title: 'Notes', type: ARTIFACT_TYPES.Markdown, content: '# One' });
  await store.apply('chat1', { command: 'rewrite', id: 'notes', content: '# Two' });
  const deps = { store, known: () => true, projectOf: () => ({ id: 'proj-1' }),
    addKnowledgeText: (projectId, entry) => addKnowledgeText(dataDir, projectId, entry, { now: () => 'T' }) };
  const result = await chatArtifactRequest({ action: 'add-to-project', threadId: 'chat1', id: 'notes', version: 1 }, deps);
  assert.equal(result.failed.length, 0);
  assert.deepEqual(result.added.map(({ name, type, chars, addedAt }) => ({ name, type, chars, addedAt })), [{ name: 'notes.md', type: 'md', chars: 5, addedAt: 'T' }]);
  assert.equal(result.stats.count, 1);
  assert.deepEqual((await readKnowledgeTexts(dataDir, 'proj-1')).map(({ entry, text }) => [entry.name, text]), [['notes.md', '# One']], 'the shown version, not the latest');
  assert.deepEqual(fs.readdirSync(path.join(knowledgeDir(dataDir, 'proj-1'), 'files')).map((name) => path.extname(name)), ['.md']);
  // The same refusals as a picked file: a path in the name, empty text, NUL bytes, over capacity.
  assert.equal((await addKnowledgeText(dataDir, 'proj-1', { name: '../x.md', text: 'x' })).failed[0].reason, 'invalid');
  assert.equal((await addKnowledgeText(dataDir, 'proj-1', { name: 'x.md', text: '  ' })).failed[0].reason, 'empty');
  assert.equal((await addKnowledgeText(dataDir, 'proj-1', { name: 'x.md', text: 'a\0b' })).failed[0].reason, 'unsupported');
  assert.equal((await addKnowledgeText(dataDir, 'proj-1', { name: 'x.md', text: 'y'.repeat(400) }, { capacity: 10 })).failed[0].reason, 'capacity');
  assert.equal((await listKnowledge(dataDir, 'proj-1')).length, 1, 'a refused text leaves nothing behind');
  await assert.rejects(addKnowledgeText(dataDir, '../up', { name: 'x.md', text: 'x' }), /Project not found/);
});

test('panel read failure: ca2ef848d’s 404 copy for a missing artifact / version / chat, "Failed to load file content" otherwise', async () => {
  const ca2 = official('ca2ef848d-');
  // ca2ef848d V: a 404 → WEjZqzBur7 (http_404), else 6u3/Jh2Vzp (fetch_error); B / ee (fetch / bad body) → 6u3/Jh2Vzp.
  assert.ok(ca2.includes('defaultMessage:"This file is no longer available.",id:"WEjZqzBur7"'), 'the official 404 copy');
  assert.ok(ca2.includes('defaultMessage:"Failed to load file content",id:"6u3/Jh2Vzp"'), 'the official load failure copy');
  assert.match(ca2, /\?[A-Za-z_$][\w$]*\.formatMessage\(\{defaultMessage:"This file is no longer available\.",id:"WEjZqzBur7"\}\):[A-Za-z_$][\w$]*\.formatMessage\(\{defaultMessage:"Failed to load file content",id:"6u3\/Jh2Vzp"\}\),[A-Za-z_$][\w$]*\?"http_404":"fetch_error"/);
  const dataDir = tmp();
  const store = createChatArtifactStore({ dataDir, now: clock() });
  await store.apply('chat1', { command: 'create', id: 'doc', type: ARTIFACT_TYPES.Text, content: 'x' });
  const deps = { store, known: (id) => id === 'chat1' };
  const failure = (promise) => promise.then(() => assert.fail('expected a rejection'), (error) => artifactReadFailure(error));
  assert.equal(await failure(chatArtifactRequest({ action: 'read', threadId: 'chat1', id: 'gone' }, deps)), 'This file is no longer available.');
  assert.equal(await failure(chatArtifactRequest({ action: 'read', threadId: 'chat1', id: 'doc', version: 9 }, deps)), 'This file is no longer available.');
  assert.equal(await failure(chatArtifactRequest({ action: 'read', threadId: 'deleted', id: 'doc' }, deps)), 'This file is no longer available.');
  // The preload strips Electron's "Error invoking remote method …" prefix, so the renderer sees the store's message as is.
  assert.equal(artifactReadFailure(new Error('Artifact not found.')), 'This file is no longer available.');
  fs.rmSync(path.join(dataDir, STORE_DIR, 'chat1', 'doc'), { recursive: true });
  assert.equal(await failure(chatArtifactRequest({ action: 'read', threadId: 'chat1', id: 'doc' }, deps)), 'Failed to load file content');
  assert.equal(artifactReadFailure(new Error('EACCES: permission denied')), 'Failed to load file content');
  assert.equal(artifactReadFailure(undefined), 'Failed to load file content');
  // The panel shows only the mapped, translated copy, never main's English message.
  const panel = fs.readFileSync(path.join(import.meta.dirname, '../src/source-chat-artifact-panel.jsx'), 'utf8');
  assert.ok(panel.includes('setError(t(artifactReadFailure(failure)))'));
  assert.equal(/setError\([^)]*failure\?\.message/.test(panel), false);
  const zh = { ...(await import('../electron/i18n/zh-CN/panes.mjs')).default, ...(await import('../electron/i18n/zh-CN/surfaces.mjs')).default };
  assert.equal(zh['This file is no longer available.'], '此文件已不可用。');
  assert.equal(zh['Failed to load file content'], '无法加载文件内容');
});

test('packaging: the main-side artifact modules import nothing from src/ (the package drops src/ but a few named models)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../package.json'), 'utf8'));
  const kept = /--ignore='\^\/src\/\(\?!\(([^)]*)\)/.exec(pkg.scripts.package)?.[1]?.split('|') ?? [];
  assert.ok(kept.length > 0, 'the package script names the src/ models it keeps');
  for (const rel of ['electron/chat-artifact-store.mjs', 'electron/chat-artifact-types.mjs', 'electron/agent-tools/chat-artifacts.mjs']) {
    const text = fs.readFileSync(path.resolve(import.meta.dirname, '..', rel), 'utf8');
    for (const [, name] of text.matchAll(/['"](?:\.\.\/)+src\/([^'"]+)\.mjs['"]/g)) assert.ok(kept.includes(name), `${rel} imports src/${name}.mjs, which the package leaves out`);
  }
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.doesNotMatch(main, /\.\.\/src\/chat-artifact-model\.mjs/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../src/chat-artifact-model.mjs'), 'utf8'), /from '\.\.\/electron\/chat-artifact-types\.mjs';/);
});

test('main.cjs: the provide line, the chat-artifacts case and the library merge (R8 small blocks)', () => {
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.equal(main.split("agentTools.provide('chatArtifacts'").length - 1, 1);
  assert.equal(main.split('case "chat-artifacts": {').length - 1, 1);
  assert.match(main, /chatLibraryRecords\(await chatArtifacts\.listAll\(chatThread\)\)/);
  assert.match(main, /webPreferences: \{ javascript: false, sandbox: true, contextIsolation: true \}/, 'the PDF page runs no script');
  assert.match(main, /addKnowledgeText: async \(projectId, entry\) => \(await import\('\.\/project-knowledge\.mjs'\)\)\.addKnowledgeText\(app\.getPath\('userData'\), projectId, entry\)/);
});
