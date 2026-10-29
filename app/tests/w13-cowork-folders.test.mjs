// w13-coworkfn-folders (research/w13-coworkfn.md §1.3 O-16~O-21/O-23; cwf-18/19/20/21): the Cowork folder grant
// (electron/cowork-runtime/folder-policy.mjs) against the 3.6556.2 snapshot's raw chunks (read, never executed), and the
// main.cjs blocks that use it. Plain node: temporary folders only, fake dialogs, no Electron.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { asarSource } from '../scripts/official-3.6556.2.mjs';
import {
  DARWIN_SYSTEM_ANCESTORS, DARWIN_SYSTEM_INTERNALS, HOME_PROTECTED_DIRS, HOME_PROTECTED_FILES, MESSAGES, NO_GRANT_ROOTS,
  PROTECTED_HOST_ROOTS, PROTECTED_PARENTS, TRUST_STATUS, TRUSTED_FOLDERS_FILE, addSessionFolder, carveGrant, carvedRoot,
  coworkFolderService, createCoworkFolderService, createTrustedFolders, folderMountSatisfied, folderReach, judgeFolder,
  protectedRoot, protectedSubpathRefusal, sessionGrants, sessionWritableFolders, trustConsentDialog, writableRootsFor,
} from '../electron/cowork-runtime/folder-policy.mjs';
import { coworkStoragePaths, createCoworkStorage, decorateCoworkTurn } from '../electron/cowork-runtime/core-cowork.mjs';
import zhCN from '../electron/i18n/zh-CN/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
// The raw chunk, with its \uXXXX escapes read as the characters they stand for.
const raw = name => fs.readFileSync(path.join(asarSource, name), 'utf8').replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
const occurrences = (text, needle) => text.split(needle).length - 1;
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
const literal = value => typeof value === 'string' ? JSON.stringify(value) : `/${value.source}/${value.flags}`;
const between = (text, start, end) => { const at = text.indexOf(start); assert.notEqual(at, -1, start); return text.slice(at + start.length, text.indexOf(end, at + start.length)); };
// A template sentence ({path}/{root}) as the official template literal's text, any ${…} in their places.
const templatePattern = text => new RegExp(text.split(/\{\w+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\$\\{[^}]+\\}'));
const temp = prefix => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

test('the protected lists are the official XK / ZK / nq / vni / Cni / hri / gri, word for word', () => {
  const DNP = raw('index.chunk-DNPOm2Zc.js'), jPK = raw('index.chunk-jPKPzV-P.js');
  assert.equal(occurrences(DNP, `,XK=[${PROTECTED_HOST_ROOTS.map(literal).join(',')}],ZK=[`), 1);
  assert.equal(between(DNP, ',ZK=[', '],QK='), PROTECTED_PARENTS.map(literal).join(','));
  assert.equal(occurrences(DNP, `,nq=[${NO_GRANT_ROOTS.map(literal).join(',')}],`), 1);
  // The official classifier that uses them: XK inside, ZK the folder itself, nq under another volume's root.
  assert.ok(DNP.includes('if(XK.some((e=>Cq(Sq(n(e),"posix"),a)))||u(a)||'));
  assert.ok(DNP.includes('nq.some((e=>Cq(Sq(e.toLowerCase(),"posix"),t)))'));
  const vni = between(jPK, 'vni=[', '].filter');
  assert.deepEqual([...vni.matchAll(/sub:"([^"]+)"/g)].map(match => match[1]), HOME_PROTECTED_DIRS.slice(0, -1));
  assert.ok(jPK.includes('bni=[".config/powershell"]'));
  assert.equal(occurrences(jPK, `Cni=[${HOME_PROTECTED_FILES.map(literal).join(',')}]`), 1);
  assert.ok(jPK.includes(`forms:[${DARWIN_SYSTEM_INTERNALS.map(literal).join(',')}],family:"darwin_system_ancestor"`));
  assert.ok(jPK.includes(`forms:[${DARWIN_SYSTEM_ANCESTORS.map(literal).join(',')}],family:"darwin_system_ancestor"`));
  // deniedCoworkMountRoot answers the protected root's first form.
  assert.ok(raw('index.chunk-h5ilKUwe.js').includes('if(a!==void 0)return r?.("protected_path"),a.root.forms[0]}'));
});

test('every folder sentence is the official text word for word', () => {
  const h5i = raw('index.chunk-h5ilKUwe.js'), Dl8 = raw('index.chunk-Dl8NPgw7.js'), Bt = raw('index.chunk-BtY4LlaK.js'), DWM = raw('index.chunk-DWMzDpbf.js');
  for (const key of ['missing', 'networkDrive', 'notDirectory', 'protected']) assert.match(h5i, templatePattern(MESSAGES[key]), key);
  for (const key of ['relative', 'unc', 'sessionStorage', 'userData']) assert.ok(h5i.includes(`"${MESSAGES[key]}"`), key);
  assert.ok(Dl8.includes(`"${MESSAGES.sessionStorageTool}"`));
  assert.match(Dl8, templatePattern(MESSAGES.protectedTool));
  // fri (jPK), the protected-location-inside-a-connected-folder sentence.
  assert.ok(raw('index.chunk-jPKPzV-P.js').includes(`function fri(e){return\`${MESSAGES.protectedSubpath.replace('{path}', '${e}')}\`}`));
  for (const key of ['chatSession', 'addTitle', 'addMessage', 'trustedTitle', 'trustedMessage', 'cantAdd', 'trustedProtected', 'pickRefused', 'trustFolder', 'cancel'])
    assert.ok(Bt.includes(`"${MESSAGES[key]}"`), key);
  assert.ok(Bt.includes('if(i?.sessionType==="chat")return{ok:!1,error:"Folder access isn\'t available in chat sessions."}'));
  assert.ok(Bt.includes('{allow:"Trust folder",cancel:"Cancel"}'));
  for (const key of ['consentTitle', 'consentMessage']) assert.ok(DWM.includes(`"${MESSAGES[key]}"`), key);
  for (const key of ['consentHome', 'consentContainsHome', 'consentDisk']) assert.ok(DWM.includes(`"${MESSAGES[key]} "`), key);
  // The 3P copy (t.Sq() is the 3P deployment): no "ones you start from the web or your phone", no command clause, and
  // the organization's-infrastructure sentence.
  const scope = between(DWM, 'scope:`${n}', '`}}');
  const thirdParty = between(DWM, 'function s(){return t.Sq()?"', '"');
  assert.ok(DWM.includes('function o(e){return t.Sq()?"":'));
  assert.equal(scope.replace('${t.Sq()?"":"ones you start from the web or your phone, and "}', '').replace('${o("this folder")}', '').replace('${r}', thirdParty), MESSAGES.consentScope);
  // consentDialogButtons(!0, …): allow first, Cancel the default and cancel id.
  assert.ok(DWM.includes('function c(e,t={allow:"Allow",cancel:"Cancel"}){return{buttons:e?[t.allow,t.cancel]:[t.cancel,t.allow],cancelIndex:+!!e,allowIndex:+!e}}'));
});

test('judgeFolder refuses protected locations, the app data and session storage with the official sentences', async () => {
  const userData = temp('cwf-ud-'), work = temp('cwf-work-'), home = temp('cwf-home-');
  const storage = await createCoworkStorage(userData);
  const opts = { userData, home };
  const protectedAt = async (dir, rootPath) => {
    const judged = await judgeFolder(dir, opts);
    assert.equal(judged.ok, false, dir);
    assert.equal(judged.kind, 'protected_path', dir);
    assert.equal(judged.message, `Directory "${dir}" is, or is inside, a protected host location (${rootPath}) and cannot be mounted.`);
  };
  await protectedAt('/etc', '/etc');
  await protectedAt('/Users', '/Users');
  await protectedAt('/System/Library', '/System');
  await protectedAt('/System', '/System/Volumes');
  await protectedAt('/Applications', '/Applications');
  fs.mkdirSync(path.join(home, '.ssh'));
  await protectedAt(path.join(home, '.ssh'), path.join(home, '.ssh'));
  // A link to a protected folder is judged where it leads.
  fs.symlinkSync('/etc', path.join(work, 'etc-link'));
  const linked = await judgeFolder(path.join(work, 'etc-link'), opts);
  assert.equal(linked.kind, 'protected_path');
  assert.equal(linked.values.root, fs.realpathSync('/etc') === '/private/etc' ? '/private/etc' : '/etc');
  assert.deepEqual(await judgeFolder(userData, opts), { ok: false, kind: 'user_data', text: MESSAGES.userData, values: undefined, message: MESSAGES.userData });
  for (const dir of [storage.outputs, storage.root, path.dirname(storage.root)]) {
    assert.equal((await judgeFolder(dir, opts)).message, MESSAGES.sessionStorage, dir);
    assert.equal((await judgeFolder(dir, { ...opts, mode: 'tool' })).message, MESSAGES.sessionStorageTool, dir);
  }
  assert.equal((await judgeFolder('/etc', { ...opts, mode: 'tool' })).message, 'Directory "/etc" is, or is inside, a protected host location (/etc) and cannot be mounted. Request a different folder instead.');
  // Ordinary folders pass, as their real path; the home folder itself is a folder like any other.
  fs.mkdirSync(path.join(work, 'project', 'docs'), { recursive: true });
  assert.deepEqual(await judgeFolder(path.join(work, 'project', 'docs'), opts), { ok: true, canonical: path.join(work, 'project', 'docs') });
  assert.deepEqual(await judgeFolder(`${work}/project/../project/`, opts), { ok: true, canonical: path.join(work, 'project') });
  assert.deepEqual(await judgeFolder(home, opts), { ok: true, canonical: home });
  assert.equal((await judgeFolder('~/', { ...opts })).ok, true);
  // Paths that aren't one folder.
  assert.equal((await judgeFolder('relative/dir', opts)).message, MESSAGES.relative);
  assert.equal((await judgeFolder(path.join(work, 'missing'), opts)).message, `Path "${path.join(work, 'missing')}" doesn't exist or isn't accessible.`);
  fs.writeFileSync(path.join(work, 'file.txt'), 'x');
  assert.equal((await judgeFolder(path.join(work, 'file.txt'), opts)).message, `Path "${path.join(work, 'file.txt')}" is not a directory.`);
  assert.equal((await judgeFolder(`${work}\u202e`, opts)).ok, false);
  // Network drives (the volume probe is injectable) unless the user picked it; UNC on Windows.
  const network = { ...opts, pathKind: async () => 'network-drive' };
  assert.equal((await judgeFolder(work, network)).message, `Path "${work}" is on a network drive. Ask the user to add it via the folder picker.`);
  assert.equal((await judgeFolder(work, { ...network, vouched: true })).ok, true);
  assert.equal((await judgeFolder('\\\\server\\share', { ...opts, platform: 'win32' })).message, MESSAGES.unc);
});

test('protectedRoot: parents only as themselves, system folders under other volumes, the data volume firmlink', () => {
  const home = '/Users/someone';
  assert.equal(protectedRoot('/Users/someone', { home }), null);
  assert.equal(protectedRoot('/Users/someone/project', { home }), null);
  assert.equal(protectedRoot('/tmp/build', { home }), null);
  assert.equal(protectedRoot('/private/tmp', { home }), '/private/tmp');
  assert.equal(protectedRoot('/private/var/folders/ab/cd/T', { home }), '/private/var/folders/ab/cd/T');
  assert.equal(protectedRoot('/private/var/folders/ab/cd/T/work', { home }), null);
  assert.equal(protectedRoot('/Volumes/Data', { home }), null);
  assert.equal(protectedRoot('/Volumes/Data/etc/hosts.d', { home }), '/Volumes/Data/etc');
  assert.equal(protectedRoot('/Volumes/Data/Users', { home }), '/Volumes/Data/Users');
  assert.equal(protectedRoot('/Volumes/Data/Users/someone', { home }), null);
  assert.equal(protectedRoot('/System/Volumes/Data/Users/someone/project', { home }), null);
  assert.equal(protectedRoot('/System/Volumes/Data/etc', { home }), '/etc');
  assert.equal(protectedRoot('/.vol/1/2', { home }), '/.vol');
  assert.equal(protectedRoot('/users/SOMEONE/.SSH/keys', { home, platform: 'darwin' }), '/Users/someone/.ssh');
  assert.equal(protectedRoot('/Users/someone/Library/Application Support/Foo', { home }), '/Users/someone/Library/Application Support');
  assert.equal(protectedRoot('/Users/someone/.zshrc', { home }), '/Users/someone/.zshrc');
});

test('trusted folders: a 0600 file written atomically, newest 300 kept, a trusted folder covers its subfolders', async () => {
  const dir = temp('cwf-trust-'), file = path.join(dir, TRUSTED_FOLDERS_FILE);
  const store = createTrustedFolders({ file });
  assert.deepEqual(await store.list(), []);
  assert.deepEqual(await store.add('/work/a/'), { status: TRUST_STATUS.added, folders: ['/work/a'] });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { version: 1, folders: ['/work/a'] });
  assert.equal((await store.add('/work/a')).status, TRUST_STATUS.alreadyTrusted);
  assert.equal(await store.has('/work/a'), true);
  assert.equal(await store.covers('/work/a/b/c'), true);
  assert.equal(await store.covers('/work/ab'), false);
  // Concurrent adds are serialized: none is lost, no temporary file stays behind.
  await Promise.all(['/w/1', '/w/2', '/w/3', '/w/4'].map(folder => store.add(folder)));
  assert.deepEqual(await store.list(), ['/work/a', '/w/1', '/w/2', '/w/3', '/w/4']);
  assert.deepEqual(fs.readdirSync(dir), [TRUSTED_FOLDERS_FILE]);
  assert.deepEqual(await store.remove('/w/2'), ['/work/a', '/w/1', '/w/3', '/w/4']);
  const small = createTrustedFolders({ file: path.join(dir, 'small.json'), limit: 2 });
  for (const folder of ['/a', '/b', '/c']) await small.add(folder);
  assert.deepEqual(await small.list(), ['/b', '/c']);
  fs.writeFileSync(path.join(dir, 'bad.json'), '{oops');
  assert.deepEqual(await createTrustedFolders({ file: path.join(dir, 'bad.json') }).list(), []);
});

test('the trusted-folder consent dialog: Trust folder / Cancel, Cancel the default, the official 3P scope', () => {
  const home = '/Users/someone';
  assert.equal(folderReach('/', { home }), 'disk');
  assert.equal(folderReach(home, { home }), 'home');
  assert.equal(folderReach('/Users', { home }), 'contains_home');
  assert.equal(folderReach('/Users/someone/x', { home }), null);
  assert.deepEqual(trustConsentDialog('/Users/someone/x', { home }), { type: 'question', buttons: ['Trust folder', 'Cancel'], defaultId: 1, cancelId: 1,
    title: 'Trusted folder', message: 'Trust this folder on this device?', detail: `/Users/someone/x\n\n${MESSAGES.consentScope}` });
  assert.equal(trustConsentDialog(home, { home }).detail, `${home}\n\nThis is your entire home folder. ${MESSAGES.consentScope}`);
  const zh = trustConsentDialog(home, { home, t: text => zhCN[text] ?? text });
  assert.deepEqual(zh.buttons, ['信任文件夹', '取消']);
  assert.ok(zh.detail.startsWith(`${home}\n\n这是你的整个个人文件夹。 `));
});

function fakeDialog(answers) {
  const calls = [];
  return {
    calls,
    async showOpenDialog(...args) { calls.push(['open', args.at(-1)]); return answers.open.shift() ?? { canceled: true, filePaths: [] }; },
    async showMessageBox(owner, options) { calls.push(['box', options]); return { response: options.type === 'question' ? answers.consent.shift() : 0 }; },
  };
}
const liveWindow = { isDestroyed: () => false };

test('cowork-folders trusted-add: picker, refusal box, consent, already trusted, no window', async () => {
  const userData = temp('cwf-svc-ud-'), work = temp('cwf-svc-work-'), home = temp('cwf-svc-home-');
  const dialog = fakeDialog({ open: [{ canceled: true, filePaths: [] }, { canceled: false, filePaths: ['/etc'] }, { canceled: false, filePaths: [work] }, { canceled: false, filePaths: [work] }], consent: [1, 0] });
  // Every answer is read (w13-close-main-process: an Allow sooner than CONSENT_ALLOW_MIN_DWELL_MS is Cancel, tests/w13-close-main-process.test.mjs).
  let clock = 0;
  const service = createCoworkFolderService({ userData, dialog, window: () => liveWindow, home, now: () => (clock += 1000) });
  assert.deepEqual(await service.run({ op: 'trusted-add' }), { status: 'cancelled' });
  assert.deepEqual(dialog.calls[0], ['open', { title: 'Add a trusted folder', message: 'Choose a folder to trust', properties: ['openDirectory', 'createDirectory'], defaultPath: home }]);
  const refused = await service.run({ op: 'trusted-add' });
  assert.equal(refused.status, 'rejected');
  assert.deepEqual(dialog.calls.at(-1), ['box', { type: 'error', message: "This folder can't be added", detail: MESSAGES.trustedProtected }]);
  assert.deepEqual(await service.run({ op: 'trusted-add' }), { status: 'cancelled' });
  assert.equal(dialog.calls.at(-1)[1].buttons[0], 'Trust folder');
  assert.deepEqual(await service.run({ op: 'trusted-add' }), { status: 'added', folder: work, folders: [work] });
  assert.equal((await service.run({ op: 'trusted-add', path: work })).status, 'already_trusted');
  assert.deepEqual(await service.run({ op: 'trusted-list' }), { folders: [work] });
  assert.equal(await service.run({ op: 'is-trusted', path: path.join(work, 'sub') }), true);
  assert.deepEqual(await service.run({ op: 'trusted-remove', path: work }), { folders: [] });
  assert.equal(fs.existsSync(path.join(userData, TRUSTED_FOLDERS_FILE)), true);
  const hidden = createCoworkFolderService({ userData, dialog, window: () => null, home });
  assert.deepEqual(await hidden.run({ op: 'trusted-add' }), { status: 'unavailable' });
  assert.deepEqual(await service.run({ op: 'defaults' }), []);
  await assert.rejects(service.run({ op: 'nope' }), /Unknown folder request\./);
});

test('cowork-folders add-to-session: chat refused, picker copy, judged, recorded, satisfied, other sessions unknown', async () => {
  const userData = temp('cwf-add-ud-'), work = temp('cwf-add-work-'), home = temp('cwf-add-home-');
  const storage = await createCoworkStorage(userData);
  fs.mkdirSync(path.join(work, 'a', 'b'), { recursive: true });
  fs.mkdirSync(path.join(work, 'c'));
  const config = { threadIds: ['cw', 'chat', 'code'], sessionMetadata: {
    cw: { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders: [path.join(work, 'a')] } },
    chat: { surface: 'chat' }, code: {} } };
  const approved = [], saved = [];
  const dialog = fakeDialog({ open: [{ canceled: false, filePaths: [path.join(work, 'c')] }, { canceled: true, filePaths: [] }], consent: [] });
  const service = createCoworkFolderService({ userData, dialog, window: () => liveWindow, home });
  const ctx = { config, save: () => saved.push(1), approve: dir => approved.push(dir) };
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'chat' }, ctx), { ok: false, error: "Folder access isn't available in chat sessions." });
  await assert.rejects(service.run({ op: 'add-to-session', threadId: 'code' }, ctx), /Unknown Cowork session\./);
  await assert.rejects(service.run({ op: 'add-to-session', threadId: 'missing' }, ctx), /Unknown Cowork session\./);
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw', path: path.join(work, 'a', 'b') }, ctx), { ok: true, folderPath: path.join(work, 'a', 'b') });
  assert.equal(dialog.calls.length, 0);
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw' }, ctx), { ok: true, folderPath: path.join(work, 'c') });
  assert.deepEqual(dialog.calls[0], ['open', { title: 'Add a folder to this session', message: 'Select a folder to give Claude access to', properties: ['openDirectory', 'createDirectory'], defaultPath: home }]);
  assert.deepEqual(config.sessionMetadata.cw.cowork.folders, [path.join(work, 'a'), path.join(work, 'c')]);
  assert.deepEqual([approved, saved.length], [[path.join(work, 'c')], 1]);
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw' }, ctx), { ok: false });
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw', path: storage.outputs }, ctx), { ok: false, error: MESSAGES.sessionStorage });
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw', path: '/etc' }, ctx), { ok: false, error: 'Directory "/etc" is, or is inside, a protected host location (/etc) and cannot be mounted.' });
  const recent = await service.run({ op: 'recent' }, ctx);
  assert.deepEqual(recent, { trusted: [], recent: [path.join(work, 'a'), path.join(work, 'c')] });
  // zh-CN through the service's t.
  const zh = createCoworkFolderService({ userData, dialog, window: () => liveWindow, home, t: (text, values) => (zhCN[text] ?? text).replace(/\{(\w+)\}/g, (m, k) => values?.[k] ?? m) });
  assert.deepEqual(await zh.run({ op: 'add-to-session', threadId: 'chat' }, ctx), { ok: false, error: '聊天会话无法访问文件夹。' });
  assert.equal((await zh.run({ op: 'add-to-session', threadId: 'cw', path: '/etc' }, ctx)).error, '文件夹“/etc”是受保护的系统位置（/etc）或位于其中，无法挂载。');
});

test('a new Cowork session\'s folders: named, else drafts (once), else the cwd; coworkFolders never reaches a core', async () => {
  const userData = temp('cwf-start-ud-'), work = temp('cwf-start-work-'), home = temp('cwf-start-home-');
  fs.mkdirSync(path.join(work, 'x')); fs.mkdirSync(path.join(work, 'y'));
  const service = createCoworkFolderService({ userData, home });
  const named = { cwd: work, codeDesktop: { coworkFolders: [path.join(work, 'x')], tools: ['a'] } };
  assert.deepEqual(await service.takeStartFolders(named, { cowork: true }), [path.join(work, 'x')]);
  assert.deepEqual(named.codeDesktop, { tools: ['a'] });
  const draft = await service.run({ op: 'draft-set', folders: [path.join(work, 'y'), '/etc'] });
  assert.deepEqual(draft, { folders: [path.join(work, 'y')], refused: [{ path: '/etc', error: 'Directory "/etc" is, or is inside, a protected host location (/etc) and cannot be mounted.' }] });
  assert.deepEqual(await service.takeStartFolders({ cwd: work }, { cowork: true }), [path.join(work, 'y')]);
  assert.deepEqual(service.drafts(), []);
  assert.deepEqual(await service.takeStartFolders({ cwd: work }, { cowork: true }), [work]);
  // The renderer's cwd that is refused is left out; a named folder that is refused fails the start.
  assert.deepEqual(await service.takeStartFolders({ cwd: userData }, { cowork: true }), []);
  await assert.rejects(service.takeStartFolders({ cwd: work, codeDesktop: { coworkFolders: ['/Users'] } }, { cowork: true }), /protected host location \(\/Users\)/);
  // Not Cowork: only taken off the request.
  const chat = { cwd: work, codeDesktop: { coworkFolders: [work] } };
  assert.equal(await service.takeStartFolders(chat, { cowork: false }), null);
  assert.equal(Object.hasOwn(chat, 'codeDesktop'), false);
  // One service per userData.
  assert.equal(coworkFolderService({ userData }), coworkFolderService({ userData: `${userData}/` }));
});

test('the writable roots are the session\'s host-cwd, outputs and granted folders, re-checked each turn', async () => {
  const userData = temp('cwf-roots-ud-'), work = temp('cwf-roots-work-');
  const storage = await createCoworkStorage(userData);
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders: [work, '/etc', userData, storage.outputs] } };
  assert.deepEqual(sessionGrants(meta, { userData }), [work]);
  assert.deepEqual(await writableRootsFor(meta, { userData }), [storage.hostCwd, storage.outputs, work]);
  assert.deepEqual(await writableRootsFor({ surface: 'chat' }, { userData }), []);
  // decorateCoworkTurn fed the granted folders (main.cjs) gives the same roots.
  const params = { threadId: 't', permissions: { profile: 'x' } };
  decorateCoworkTurn(params, { storage: coworkStoragePaths(userData, storage.id), folders: sessionGrants(meta, { userData }) });
  assert.deepEqual(params.sandboxPolicy.writableRoots, await writableRootsFor(meta, { userData }));
  // A folder added later is a root from the next turn on.
  const grown = addSessionFolder(meta, path.join(work, '..', path.basename(work), 'sub'));
  fs.mkdirSync(path.join(work, 'sub'));
  assert.deepEqual((await writableRootsFor(grown, { userData })).at(-1), path.join(work, 'sub'));
  assert.equal(folderMountSatisfied(grown, path.join(work, 'deeper'), { userData }), true);
  assert.equal(folderMountSatisfied(grown, '/etc/x', { userData }), false);
  assert.throws(() => addSessionFolder({ surface: 'chat' }, work), /Unknown Cowork session\./);
});

// Review fix (E60): a connected home folder or disk never makes its protected insides writable (official carve / fri).
const carveFixture = async () => {
  const home = temp('cwf-carve-home-'), userData = path.join(home, 'Library', 'Application Support', 'OpenClaude');
  for (const dir of ['Documents/a', '.ssh', '.claude', '.codex', '.config/gh', '.config/fish', 'Library/Keychains', 'Library/Preferences', 'proj'])
    fs.mkdirSync(path.join(home, dir), { recursive: true });
  fs.writeFileSync(path.join(home, '.zshrc'), '');
  fs.writeFileSync(path.join(home, 'notes.txt'), '');
  fs.symlinkSync(path.join(home, '.ssh'), path.join(home, 'proj', 'keys'));
  fs.symlinkSync(home, path.join(home, 'Documents', 'loop'));
  fs.mkdirSync(userData, { recursive: true });
  const storage = await createCoworkStorage(userData);
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders: [home] } };
  return { home, userData, storage, meta };
};

test('a connected home folder: its protected insides are carved out of the writable roots, the rest stays writable', async () => {
  const { home, userData, storage, meta } = await carveFixture();
  const options = { userData, home };
  assert.deepEqual(sessionGrants(meta, options), [home]);
  const folders = await sessionWritableFolders(meta, options);
  assert.deepEqual(folders, ['.config/fish', 'Documents', 'Library/Preferences', 'proj'].map(rel => path.join(home, rel)));
  assert.deepEqual(await writableRootsFor(meta, options), [storage.hostCwd, storage.outputs, ...folders]);
  const writable = target => folders.some(root => target === root || target.startsWith(`${root}/`));
  for (const rel of ['.ssh/authorized_keys', '.claude/settings.json', '.codex/auth.json', '.config/gh/hosts.yml', 'Library/Keychains/k', '.zshrc', 'notes.txt', 'new-file', 'Library/Application Support/OpenClaude/cowork-sessions/other/outputs/x'])
    assert.equal(writable(path.join(home, rel)), false, rel);
  assert.equal(writable(path.join(home, 'Documents', 'a', 'x')), true);
  // A symbolic link inside a writable subtree is the core sandbox's own business (it resolves real paths); the walk never
  // follows one, and the session's own host-cwd / outputs stay writable through their own roots.
  assert.ok(!folders.some(root => root.endsWith('/keys') || root.endsWith('/loop')));
  // The carved paths are never satisfied; the tool guard and add-to-session say the official fri sentence.
  for (const rel of ['.ssh', '.zshrc', 'Library/Application Support/OpenClaude'])
    assert.equal(folderMountSatisfied(meta, path.join(home, rel), options), false, rel);
  assert.equal(folderMountSatisfied(meta, path.join(home, 'Documents'), options), true);
  const fri = await protectedSubpathRefusal(meta, path.join(home, '.ssh', 'id_ed25519'), options);
  assert.equal(fri.message, MESSAGES.protectedSubpath.replace('{path}', path.join(home, '.ssh', 'id_ed25519')));
  assert.equal((await protectedSubpathRefusal(meta, path.join(home, 'proj', 'keys', 'id'), options))?.kind, 'protected_subpath');
  assert.equal(await protectedSubpathRefusal(meta, path.join(home, 'Documents', 'a'), options), null);
  assert.equal(await protectedSubpathRefusal(meta, path.join(storage.outputs, 'report.md'), options), null);
  assert.equal(await protectedSubpathRefusal(meta, '/etc/hosts', options), null, 'not inside a connected folder: containment is the tool guard\'s');
  const service = createCoworkFolderService({ userData, home });
  const config = { threadIds: ['cw'], sessionMetadata: { cw: meta } }, approved = [];
  for (const rel of ['.ssh', 'Library/Application Support/OpenClaude', 'proj/keys']) {
    const answer = await service.run({ op: 'add-to-session', threadId: 'cw', path: path.join(home, rel) }, { config, approve: dir => approved.push(dir) });
    assert.deepEqual(answer, { ok: false, error: MESSAGES.protectedSubpath.replace('{path}', path.join(home, rel)) }, rel);
  }
  assert.deepEqual([approved, config.sessionMetadata.cw.cowork.folders], [[], [home]]);
  assert.deepEqual(await service.run({ op: 'add-to-session', threadId: 'cw', path: path.join(home, 'Documents') }, { config }), { ok: true, folderPath: path.join(home, 'Documents') });
  const zh = createCoworkFolderService({ userData, home, t: (text, values) => (zhCN[text] ?? text).replace(/\{(\w+)\}/g, (m, k) => values?.[k] ?? m) });
  assert.match((await zh.run({ op: 'add-to-session', threadId: 'cw', path: path.join(home, '.ssh') }, { config })).error, /位于已连接文件夹中的受保护位置/);
});

test('carveGrant: a disk, a grant inside a protected location, a moved grant, other volumes, the limits', async () => {
  const { home, userData } = await carveFixture();
  const ctx = { userData, home };
  // The whole disk: no system location, no home protected folder, no app data, no folder above them is writable.
  // (The fixture's home sits deep in the system temporary folder, which holds thousands of folders: no limits here.)
  const disk = await carveGrant('/', { ...ctx, limit: Infinity, depth: Infinity });
  assert.ok(disk.length > 0);
  for (const target of ['/', '/etc', '/usr/bin', '/System', '/Library', '/Applications', '/dev', '/private/etc', '/private/var/db', path.join(home, '.ssh', 'x'), path.join(home, 'x')])
    assert.equal(disk.some(root => target === root || target.startsWith(`${root}/`)), false, target);
  assert.ok(disk.includes(path.join(home, 'Documents')));
  // carvedRoot is the official carve: no ZK parent (those are about the folder itself), the app data included.
  assert.equal(carvedRoot('/Users', ctx), null);
  assert.equal(carvedRoot(path.join(userData, 'x'), ctx), userData);
  assert.equal(carvedRoot('/Volumes/Ext/Library/x', ctx), '/Volumes/Ext/Library');
  assert.equal(carvedRoot('/Volumes/Ext/Users', ctx), null);
  // A grant that is, or now resolves into, a protected location gives nothing.
  assert.deepEqual(await carveGrant(path.join(home, '.ssh'), ctx), []);
  assert.deepEqual(await carveGrant(path.join(home, 'proj', 'keys'), ctx), []);
  assert.deepEqual(await carveGrant(path.join(home, 'gone'), ctx), []);
  assert.deepEqual(await carveGrant(path.join(home, 'Documents'), ctx), [path.join(home, 'Documents')]);
  // Too many subtrees: no root at all; a folder holding a protected location too deep down: that subtree left out.
  assert.deepEqual(await carveGrant(home, { ...ctx, limit: 2 }), []);
  const shallow = await carveGrant(home, { ...ctx, depth: 1 });
  assert.deepEqual(shallow, ['Documents', 'proj'].map(rel => path.join(home, rel)));
});

test('a new Cowork session never connects the home folder or a disk only because it is the renderer\'s cwd', async () => {
  const { home, userData } = await carveFixture();
  const service = createCoworkFolderService({ userData, home });
  assert.deepEqual(await service.takeStartFolders({ cwd: home }, { cowork: true }), []);
  assert.deepEqual(await service.takeStartFolders({ cwd: '/' }, { cowork: true }), []);
  assert.deepEqual(await service.takeStartFolders({ cwd: path.join(home, 'Documents') }, { cowork: true }), [path.join(home, 'Documents')]);
  // Chosen on purpose (named or a draft), the home folder is connected, its protected insides carved out each turn.
  assert.deepEqual(await service.takeStartFolders({ cwd: home, codeDesktop: { coworkFolders: [home] } }, { cowork: true }), [home]);
});

test('main.cjs: the cowork-folders IPC next to cowork-rewind; thread/start judges folders before the storage; turns use the grants', () => {
  const block = main.slice(main.indexOf('case "cowork-folders": {'), main.indexOf('case "cowork-rewind": {'));
  assert.ok(block.length > 0 && block.length < 1200, 'cowork-folders sits right before cowork-rewind');
  assert.ok(block.includes('folderPolicy.coworkFolderService({ userData: app.getPath("userData"), dialog, window: () => win, t: (text, values) => i18n.t(text, values) })'));
  assert.ok(block.includes('.run(p, { config, save, approve: (dir) => approvedWorkspaceRoots.add(dir) })'));
  const take = main.indexOf('await coworkFolderGrants.takeStartFolders(params, { cowork: requestedSurface === "cowork" })');
  const create = main.indexOf('coworkStart = await cowork.createCoworkStorage(app.getPath("userData"));');
  const decorate = main.indexOf('instructionsService.decorate(p.method, params);');
  assert.ok(take > 0 && take < create && create < decorate);
  assert.ok(main.includes('cowork.decorateCoworkStart(params, { storage: coworkStart, folders: startFolders }).folders;'));
  assert.ok(main.includes('for (const dir of coworkStart.folders) approvedWorkspaceRoots.add(dir);'));
  assert.ok(main.includes('folders: await folderPolicy.sessionWritableFolders(config.sessionMetadata[params.threadId], { userData: app.getPath("userData") })'));
  assert.equal(occurrences(main, 'folders: folderPolicy.sessionGrants('), 0);
  assert.equal(occurrences(main, 'folders: [params.cwd]'), 0);
  assert.equal(occurrences(main, 'folders: coworkCore.folders'), 0);
});

test('zh-CN: every folder sentence the user sees is translated, placeholders kept', () => {
  const modelOnly = new Set([MESSAGES.sessionStorageTool, MESSAGES.protectedTool]);
  for (const text of [...Object.values(MESSAGES).filter(text => !modelOnly.has(text)), 'Choose a folder.', 'Unknown folder request.']) {
    assert.equal(typeof zhCN[text], 'string', text);
    for (const placeholder of text.match(/\{\w+\}/g) ?? []) assert.ok(zhCN[text].includes(placeholder), `${text} keeps ${placeholder}`);
  }
});
