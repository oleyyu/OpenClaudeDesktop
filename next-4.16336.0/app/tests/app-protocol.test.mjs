// U-2 (round3-decisions.json, legacy-prep #6): the page leaves file:// for app://localhost (electron/app-protocol.cjs,
// 4.16336.0 qGn/imi/Smi/_mi/X_), shows local media through claude-media:// (electron/session-media.cjs, 4.16336.0 x9
// SessionMedia) and carries its file:// localStorage over once (electron/origin-storage-migration.cjs, the 4.16336.0
// Chrome-import storage seed). The isolated Electron probe (round3/prestage/app-protocol/probe) checks the same rules
// in a real renderer; these are the node-level checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const { APP_ORIGIN, APP_SCHEME_PRIVILEGES, appPageUrl, createAppProtocolHandler, isAppSenderFrame, withFrameAncestors } = require('../electron/app-protocol.cjs');
const media = require('../electron/session-media.cjs');
const { migrateFileOriginStorage, SEED_PATH } = require('../electron/origin-storage-migration.cjs');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'oc-u2-'));
const official = (rel) => { try { return fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104', rel), 'utf8'); } catch { return null; } };

function dist() {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>index</title>');
  fs.writeFileSync(path.join(root, 'assets/app.js'), 'export {}');
  fs.writeFileSync(path.join(root, 'assets/icon.svg'), '<svg/>');
  fs.writeFileSync(path.join(path.dirname(root), path.basename(root) + '-secret.txt'), 'secret');
  return root;
}
const fetched = [];
const fakeFetch = async (url) => { fetched.push(url); return new Response(fs.readFileSync(new URL(url)), { headers: { 'Content-Type': 'text/javascript' } }); };
const get = (handler, url, headers = {}) => handler(new Request(url, { headers }));

test('official sources: the app scheme, its handler rules and claude-media are the ones ported', { skip: !official('asar/.vite/build/index.chunk-Du-Wqi0E.js') && 'no frozen snapshot' }, () => {
  const main = official('asar/.vite/build/index.chunk-Du-Wqi0E.js');
  assert.ok(main.includes('qGn={scheme:"app",privileges:{standard:!0,secure:!0,supportFetchAPI:!0,allowServiceWorkers:!0}}'));
  assert.deepEqual(APP_SCHEME_PRIVILEGES, { standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true });
  assert.ok(main.includes('var Fu="app://localhost"'));
  assert.equal(APP_ORIGIN, 'app://localhost');
  assert.ok(main.includes('if(o.hostname!=="localhost")return new Response(null,{status:404});let l=o.pathname,d=n.default.resolve(t,"."+l);if(d!==t&&!d.startsWith(t+n.default.sep))return new Response(null,{status:403})'));
  assert.ok(main.includes(`t.append("Content-Security-Policy","frame-ancestors 'none'")`));
  assert.ok(main.includes('nmi="picture-in-picture=self"'));
  assert.ok(main.includes('{scheme:"claude-media",privileges:{standard:!0,secure:!0,stream:!0,bypassCSP:!0}}'));
  assert.deepEqual(media.MEDIA_SCHEME_PRIVILEGES, { standard: true, secure: true, stream: true, bypassCSP: true });
  assert.ok(main.includes('f_o={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".webp":"image/webp",".bmp":"image/bmp",".avif":"image/avif"},p_o=10485760'));
  assert.ok(main.includes('x_o=216e5,S_o=64'));
  assert.equal(media.TOKEN_TTL_MS, 216e5); assert.equal(media.MAX_TOKENS, 64); assert.equal(media.SIGNED_MAX_BYTES, 10485760);
  const seed = official('asar/.vite/build/index.chunk-DDNaWqT2.js');
  assert.ok(seed.includes('je="/__claude-import__"'));
  assert.equal(SEED_PATH, '/__claude-import__');
  assert.ok(seed.includes('e("DOMStorage.setDOMStorageItem",{key:n,value:a})'));
  assert.ok(seed.includes('let o={securityOrigin:r,isLocalStorage:!0}'));
});

test('app://localhost: only localhost, nothing outside the bundle, a missing path or folder is index.html', async () => {
  const root = dist();
  const handler = createAppProtocolHandler({ root, fetchFile: fakeFetch });
  const index = await get(handler, 'app://localhost/index.html?window=session');
  assert.equal(index.status, 200);
  assert.equal(await index.text(), '<!doctype html><title>index</title>');
  assert.equal(index.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(index.headers.get('content-security-policy'), "frame-ancestors 'none'");
  assert.equal(index.headers.get('permissions-policy'), 'picture-in-picture=self');
  assert.equal((await get(handler, 'app://evil/index.html')).status, 404, 'another host');
  assert.equal((await get(handler, 'app://localhost.evil/index.html')).status, 404);
  // WHATWG URL parsing already folds /../ and %2e%2e, so every spelled traversal stays inside and ends at index.html.
  for (const p of ['/../' + path.basename(root) + '-secret.txt', '/%2e%2e/' + path.basename(root) + '-secret.txt', '/..%2F' + path.basename(root) + '-secret.txt', '/assets/../../x', '/missing', '/assets/']) {
    const answer = await get(handler, 'app://localhost' + p);
    assert.equal(answer.status, 200, p);
    assert.equal(await answer.text(), '<!doctype html><title>index</title>', p);
  }
  const js = await get(handler, 'app://localhost/assets/app.js');
  assert.equal(js.headers.get('content-type'), 'text/javascript');
  assert.equal(js.headers.get('permissions-policy'), 'picture-in-picture=self');
  assert.equal(js.headers.get('content-security-policy'), "frame-ancestors 'none'");
  assert.equal(fetched.at(-1), new URL('file://' + path.join(root, 'assets/app.js')).href, 'net.fetch of the file inside the bundle');
  const svg = await get(handler, 'app://localhost/assets/icon.svg');
  assert.equal(svg.headers.get('content-type'), 'image/svg+xml', 'ami: .svg read directly with its type');
  assert.throws(() => createAppProtocolHandler({ root: 'dist', fetchFile: fakeFetch }), /absolute/);
});

test('app://localhost: a path that resolves outside the root answers 403 (imi d!==t&&!d.startsWith(t+sep))', async () => {
  const root = dist();
  const handler = createAppProtocolHandler({ root, fetchFile: fakeFetch });
  // URL objects normalise dot segments; a pathname that keeps a literal ".." needs a URL-like object.
  const OriginalURL = globalThis.URL;
  globalThis.URL = class extends OriginalURL { get pathname() { return super.pathname === '/escape' ? '/../escape' : super.pathname; } };
  try { assert.equal((await get(handler, 'app://localhost/escape')).status, 403); }
  finally { globalThis.URL = OriginalURL; }
});

test('_mi keeps an answer that already names frame-ancestors and appends to the others', () => {
  const own = withFrameAncestors(new Response('', { headers: { 'Content-Security-Policy': "frame-ancestors 'self'" } }));
  assert.equal(own.headers.get('content-security-policy'), "frame-ancestors 'self'");
  const plain = withFrameAncestors(new Response('', { headers: { 'Content-Security-Policy': "default-src 'self'" } }));
  assert.equal(plain.headers.get('content-security-policy'), "default-src 'self', frame-ancestors 'none'");
});

test('X_: an IPC sender is the app only from its own top frame at app://localhost', () => {
  assert.equal(isAppSenderFrame({ url: 'app://localhost/index.html?window=session', parent: null }), true);
  assert.equal(isAppSenderFrame({ url: 'app://localhost/index.html', parent: {} }), false, 'a sub frame');
  assert.equal(isAppSenderFrame({ url: 'file:///Applications/x/dist/index.html', parent: null }), false);
  assert.equal(isAppSenderFrame({ url: 'file:///x/index.html', parent: null }, ['file://']), true, 'only when main allows it (failed migration)');
  assert.equal(isAppSenderFrame({ url: 'http://127.0.0.1:5173/', parent: null }, ['http://127.0.0.1:5173']), true, 'dev server');
  assert.equal(isAppSenderFrame({ url: 'https://evil.example/', parent: null }), false);
  assert.equal(isAppSenderFrame({ url: 'oc-file-preview://t/a.html', parent: null }), false);
  assert.equal(isAppSenderFrame(null), false);
  assert.equal(appPageUrl(), 'app://localhost/index.html');
  assert.equal(appPageUrl({ window: 'pane', popout: 's 1', cwd: '/a b' }), 'app://localhost/index.html?window=pane&popout=s+1&cwd=%2Fa+b');
});

function mediaFixture() {
  const dir = fs.realpathSync(tmp());
  fs.writeFileSync(path.join(dir, 'a.png'), Buffer.from('0123456789'));
  fs.writeFileSync(path.join(dir, 'clip.mp4'), Buffer.from('abcdefghij'));
  fs.writeFileSync(path.join(dir, 'doc.pdf'), '%PDF-1.1');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'text');
  fs.symlinkSync(path.join(dir, 'a.png'), path.join(dir, 'link.png'));
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.symlinkSync(dir, path.join(dir, 'loop'));
  return dir;
}
const token = (url) => new URL(url).pathname.split('/').filter(Boolean)[0];

test('claude-media: main mints one unguessable URL per file of a media type, deduplicated; anything else is refused', () => {
  const dir = mediaFixture();
  const m = media.createSessionMedia();
  const png = m.mintLocalMedia(path.join(dir, 'a.png'));
  assert.match(png, /^claude-media:\/\/v\/[A-Za-z0-9_-]{22}\?v=\d+$/);
  assert.equal(m.mintLocalMedia(path.join(dir, 'a.png')), png, 'T_o: the same file has the same token');
  assert.equal(m.mintLocalMedia(path.join(dir, 'link.png')), png, 'a symbolic link is minted for the file it names (realpath)');
  assert.match(m.mintLocalMedia(path.join(dir, 'clip.mp4')), /^claude-media:\/\/v\//);
  assert.match(m.mintLocalMedia(path.join(dir, 'doc.pdf')), /^claude-media:\/\/v\//);
  for (const refused of [path.join(dir, 'notes.txt'), 'a.png', path.join(dir, 'missing.png'), path.join(dir, 'sub'), '/etc/hosts', '//server/share/a.png', path.join(dir, 'a.png') + '\0x', 42, null])
    assert.equal(m.mintLocalMedia(refused), null, String(refused));
});

test('claude-media: the handler answers a minted token, with ranges; a forged token, another host, a swapped-in link are 404', async () => {
  const dir = mediaFixture();
  const m = media.createSessionMedia();
  const png = m.mintLocalMedia(path.join(dir, 'a.png'));
  const whole = await m.handle(new Request(png));
  assert.equal(whole.status, 200);
  assert.equal(whole.headers.get('content-type'), 'image/png');
  assert.equal(whole.headers.get('accept-ranges'), 'bytes');
  assert.equal(whole.headers.get('cache-control'), 'no-store');
  assert.equal(whole.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await whole.text(), '0123456789');
  const part = await m.handle(new Request(png, { headers: { range: 'bytes=2-4' } }));
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), 'bytes 2-4/10');
  assert.equal(await part.text(), '234');
  const tail = await m.handle(new Request(png, { headers: { range: 'bytes=-3' } }));
  assert.equal(await tail.text(), '789');
  const bad = await m.handle(new Request(png, { headers: { range: 'bytes=20-' } }));
  assert.equal(bad.status, 416);
  assert.equal(bad.headers.get('content-range'), 'bytes */10');
  assert.equal((await m.handle(new Request('claude-media://v/AAAAAAAAAAAAAAAAAAAAAA'))).status, 404);
  assert.equal((await m.handle(new Request(png.replace('://v/', '://x/')))).status, 404);
  assert.equal((await m.handle(new Request('claude-media://v/'))).status, 404);
  // Cx: a token whose path now runs through a symbolic link is refused (the file was swapped for a link).
  const raw = m.mint(path.join(dir, 'link.png'), 'image/png');
  assert.equal((await m.handle(new Request(raw))).status, 404);
  const viaLoop = m.mint(path.join(dir, 'loop', 'a.png'), 'image/png');
  assert.equal((await m.handle(new Request(viaLoop))).status, 404, 'a link on any component');
  // v_o: the authorisation hook is asked for every answer.
  m.setAuthorize(async (p) => !p.endsWith('a.png'));
  assert.equal((await m.handle(new Request(png))).status, 404);
  m.setAuthorize(null);
  assert.equal((await m.handle(new Request(png))).status, 200);
  // withinRoot (M_o): an entry minted for a root answers only inside it.
  const outside = m.mint(path.join(dir, 'a.png'), 'image/png', { sessionId: 's', withinRoot: path.join(dir, 'sub') });
  assert.equal((await m.handle(new Request(outside))).status, 404);
});

test('claude-media: tokens expire 6 h after last use and at most 64 are kept (oldest out)', async () => {
  const dir = mediaFixture();
  let now = 1_000_000;
  const m = media.createSessionMedia({ now: () => now });
  const first = m.mint(path.join(dir, 'a.png'), 'image/png');
  for (let i = 0; i < 63; i++) m.mint(path.join(dir, `x${i}.png`), 'image/png');
  assert.equal(m.size(), 64);
  m.mint(path.join(dir, 'y.png'), 'image/png');
  assert.equal(m.size(), 64);
  assert.equal((await m.handle(new Request(first))).status, 404, 'the oldest token left');
  const fresh = m.mint(path.join(dir, 'a.png'), 'image/png');
  now += media.TOKEN_TTL_MS - 1;
  assert.equal((await m.handle(new Request(fresh))).status, 200, 'still in time; the answer refreshes it');
  now += media.TOKEN_TTL_MS - 1;
  assert.equal((await m.handle(new Request(fresh))).status, 200);
  now += media.TOKEN_TTL_MS + 1;
  assert.equal((await m.handle(new Request(fresh))).status, 404, 'expired');
});

test('claude-media: HMAC-signed session URLs (b_o/A_o) answer only the signed image inside the session root', async () => {
  const dir = mediaFixture();
  const m = media.createSessionMedia();
  m.setSessionRootResolver(async (id) => (id === 'sess' ? dir : null));
  const url = m.signedUrl('sess', dir, 'a.png');
  assert.match(url, /^claude-media:\/\/s\/sess\/a\.png\?sig=[A-Za-z0-9_-]{43}$/);
  const ok = await m.handle(new Request(url));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), '0123456789');
  const forged = url.replace(/sig=.*/, 'sig=' + 'A'.repeat(43));
  assert.equal((await m.handle(new Request(forged))).status, 404, 'wrong signature');
  assert.equal((await m.handle(new Request(url.replace('a.png', 'clip.mp4')))).status, 404, 'f_o: images only, and the signature names the file');
  assert.equal((await m.handle(new Request(m.signedUrl('other', dir, 'a.png')))).status, 404, 'unknown session');
  assert.equal((await m.handle(new Request(m.signedUrl('sess', dir, 'link.png')))).status, 404, 'a link inside the root');
  assert.equal((await m.handle(new Request(m.signedUrl('sess', dir, '../a.png')))).status, 404, 'outside the root');
  fs.writeFileSync(path.join(dir, 'big.png'), Buffer.alloc(media.SIGNED_MAX_BYTES + 1));
  assert.equal((await m.handle(new Request(m.signedUrl('sess', dir, 'big.png')))).status, 404, 'p_o 10 MB');
  fs.linkSync(path.join(dir, 'a.png'), path.join(dir, 'hard.png'));
  assert.equal((await m.handle(new Request(m.signedUrl('sess', dir, 'hard.png')))).status, 404, 'u_o: a second hard link is refused');
  const other = media.createSessionMedia();
  other.setSessionRootResolver(async () => dir);
  assert.equal((await other.handle(new Request(url))).status, 404, 'another launch (another key) does not accept it');
});

test('claude-media: Copy image reads a minted image as a data URL from main; non-images and forged URLs get nothing', async () => {
  const dir = mediaFixture();
  const m = media.createSessionMedia();
  const png = m.mintLocalMedia(path.join(dir, 'a.png'));
  const answer = await m.readDataUrl(png);
  assert.deepEqual(answer, { dataUrl: `data:image/png;base64,${Buffer.from('0123456789').toString('base64')}`, name: 'a.png', mime: 'image/png' });
  assert.equal(await m.readDataUrl(m.mintLocalMedia(path.join(dir, 'clip.mp4'))), null);
  assert.equal(await m.readDataUrl('claude-media://v/AAAAAAAAAAAAAAAAAAAAAA'), null);
  assert.equal(await m.readDataUrl('file:///etc/hosts'), null);
  const { copyableImage, localMediaUrl, isLocalMediaUrl } = await import('../src/local-media-url.mjs');
  class FakeImage { set src(v) { this._src = v; queueMicrotask(() => this.onload()); } get src() { return this._src; } }
  const calls = [];
  const image = await copyableImage({ currentSrc: png }, { call: async (action, p) => { calls.push([action, p]); return answer; }, ImageClass: FakeImage });
  assert.deepEqual(calls, [['media:data-url', { url: png }]]);
  assert.equal(image.src, answer.dataUrl);
  const plain = { currentSrc: 'data:image/png;base64,AA==' };
  assert.equal(await copyableImage(plain, { call: async () => assert.fail('not asked') }), plain);
  await assert.rejects(copyableImage({ src: png }, { call: async () => null, ImageClass: FakeImage }), /unavailable/);
  assert.equal(isLocalMediaUrl(png), true);
  assert.equal(localMediaUrl('/a.png', { mediaUrl: () => 'file:///a.png' }), null);
  assert.equal(localMediaUrl('/a.png', { mediaUrl: () => { throw new Error('ipc'); } }), null);
});

// A fake of the hidden WebContentsView + debugger the storage seed drives: one Map per securityOrigin.
function fakeElectron({ stores, failOn = null, hang = false }) {
  const log = [];
  class FakeContents extends EventEmitter {
    constructor() { super(); this.url = ''; this.destroyed = false; this.debugger = new EventEmitter(); this.debugger.attach = () => log.push('attach'); this.debugger.detach = () => log.push('detach');
      this.debugger.sendCommand = async (method, params = {}) => {
        log.push(method);
        if (failOn && failOn(method, params)) throw new Error('cdp failed');
        const id = params.storageId;
        const store = id ? (stores[id.securityOrigin] ??= new Map()) : null;
        if (method === 'DOMStorage.getDOMStorageItems') return { entries: [...store] };
        if (method === 'DOMStorage.setDOMStorageItem') { store.set(params.key, params.value); return {}; }
        return {};
      }; }
    loadURL(url) { if (hang && url !== 'about:blank') return new Promise(() => {}); this.url = url; log.push('load ' + url); queueMicrotask(() => this.emit('did-finish-load')); return Promise.resolve(); }
    getURL() { return this.url; }
    isDestroyed() { return this.destroyed; }
    stop() {} close() { this.destroyed = true; log.push('close'); }
  }
  class WebContentsView { constructor(options) { log.push(options.webPreferences); this.webContents = new FakeContents(); } }
  return { WebContentsView, log, session: { flushStorageData: () => log.push('flush') } };
}

test('localStorage migration: once, file:// → app://localhost, never overwriting the new origin, with a backup and no state on failure', async () => {
  const userData = tmp();
  const stores = { 'file://': new Map([['oc.settings', '{"theme":"dark"}'], ['oc.sidebar', '312'], ['oc.draft', '草稿 😀']]), [APP_ORIGIN]: new Map([['oc.sidebar', '400']]) };
  const e = fakeElectron({ stores });
  const first = await migrateFileOriginStorage({ WebContentsView: e.WebContentsView, session: e.session, userData, appOrigin: APP_ORIGIN });
  assert.equal(first.status, 'done');
  assert.deepEqual([first.state.read, first.state.kept, first.state.written, first.state.skipped], [3, 1, 2, 0]);
  assert.deepEqual(Object.fromEntries(stores[APP_ORIGIN]), { 'oc.sidebar': '400', 'oc.settings': '{"theme":"dark"}', 'oc.draft': '草稿 😀' }, 'the newer value is kept');
  assert.deepEqual(Object.fromEntries(stores['file://']), { 'oc.settings': '{"theme":"dark"}', 'oc.sidebar': '312', 'oc.draft': '草稿 😀' }, 'the old origin is left as it was');
  const backup = JSON.parse(fs.readFileSync(first.state.backup, 'utf8'));
  assert.deepEqual(backup.items, [['oc.settings', '{"theme":"dark"}'], ['oc.sidebar', '312'], ['oc.draft', '草稿 😀']]);
  // Ie: every view has javascript, images and webgl off; the app document is the seed path, fulfilled empty (Le).
  const prefs = e.log.filter((x) => typeof x === 'object');
  assert.equal(prefs.length, 2);
  for (const p of prefs) assert.deepEqual([p.javascript, p.images, p.webgl, p.sandbox, p.contextIsolation, p.nodeIntegration], [false, false, false, true, true, false]);
  assert.ok(e.log.includes(`load ${APP_ORIGIN}${SEED_PATH}`));
  assert.ok(e.log.includes('Fetch.enable'));
  assert.equal(e.log.filter((x) => x === 'close').length, 2);
  // Idempotent: the state answers "already" and nothing is read or written again.
  const again = fakeElectron({ stores });
  assert.equal((await migrateFileOriginStorage({ WebContentsView: again.WebContentsView, session: again.session, userData, appOrigin: APP_ORIGIN })).status, 'already');
  assert.equal(again.log.length, 0);
  // A failed write leaves no state (next launch retries; main keeps file:// for this one).
  const freshData = tmp();
  const failing = fakeElectron({ stores: { 'file://': new Map([['k', 'v']]) }, failOn: (m) => m === 'DOMStorage.setDOMStorageItem' });
  const failed = await migrateFileOriginStorage({ WebContentsView: failing.WebContentsView, session: failing.session, userData: freshData, appOrigin: APP_ORIGIN });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error.code, 'ERR_SEED_ITEMS');
  assert.equal(fs.existsSync(path.join(freshData, 'origin-migration/state.json')), false);
  // Ae: a document that never loads times out and is closed.
  const hung = fakeElectron({ stores: {}, hang: true });
  const timedOut = await migrateFileOriginStorage({ WebContentsView: hung.WebContentsView, session: hung.session, userData: tmp(), appOrigin: APP_ORIGIN, timeoutMs: 50 });
  assert.deepEqual([timedOut.status, timedOut.error.code], ['failed', 'ERR_SEED_TIMEOUT']);
  assert.ok(hung.log.includes('close'));
  // A fresh profile (nothing under file://) is done with nothing written and no backup.
  const empty = fakeElectron({ stores: {} });
  const none = await migrateFileOriginStorage({ WebContentsView: empty.WebContentsView, session: empty.session, userData: tmp(), appOrigin: APP_ORIGIN });
  assert.deepEqual([none.status, none.state.read, none.state.written, none.state.backup], ['done', 0, 0, null]);
});

test('main.cjs: every page window loads app://localhost (dev server unchanged), after the migration; IPC needs the app origin', () => {
  const main = read('electron/main.cjs');
  assert.equal(main.split('loadFile(').length - 1, 1, 'the one loadFile is the failed-migration fallback inside loadAppPage');
  assert.match(main, /if \(appPageOrigin === "file"\) return window\.loadFile\(path\.join\(APP_DIST, "index\.html"\)/);
  assert.match(main, /return window\.loadURL\(appPageUrl\(query\)\);/);
  assert.equal(main.split('await loadAppPage(window, ').length - 1, 2, 'pane popout and session popout');
  assert.match(main, /function loadMainWindow\(window\) \{\n  if \(process\.env\.CODE_DESKTOP_DEV_URL\) return window\.loadURL\(process\.env\.CODE_DESKTOP_DEV_URL\);\n  return loadAppPage\(window\);\n\}/);
  assert.match(main, /protocol\.handle\(APP_SCHEME, createAppProtocolHandler\(\{ root: APP_DIST, fetchFile: \(url\) => require\("electron"\)\.net\.fetch\(url\)/);
  assert.match(main, /protocol\.handle\(MEDIA_SCHEME, sessionMedia\.handle\);/);
  const migrate = main.indexOf('migrateFileOriginStorage({');
  assert.ok(migrate > 0 && migrate < main.indexOf('await loadMainWindow(firstWindow);'), 'the copy runs before the first page load');
  assert.match(main, /if \(migration\.status === "failed"\) appPageOrigin = "file";/);
  assert.match(main, /function validSender\(e, action\) \{\n  \/\/ X_[^\n]*\n  if \(!appSenderFrame\(e\.senderFrame\)\) throw new Error\("Untrusted renderer\."\);/);
  assert.match(main, /ipcMain\.on\("desktop:media-url", \(e, filePath\) => \{/);
  assert.match(main, /const trusted = appSenderFrame\(e\.senderFrame\) && \(windowRegistry\.isMainSender\(e\) \|\| \(popoutForSender\(e\.sender\) && e\.senderFrame === e\.sender\.mainFrame\)\);/);
  const preload = read('electron/preload.cjs');
  assert.match(preload, /ipcRenderer\.sendSync\("desktop:media-url", filePath\)/);
  // The renderer never builds a file:// URL for something it loads.
  for (const rel of ['src/file-preview-model.mjs', 'src/media-item-model.mjs', 'src/source-session.jsx', 'src/main.jsx'])
    assert.doesNotMatch(read(rel), /encodeURI\(`file:\/\/\$\{/, rel);
  assert.doesNotMatch(read('src/source-code-transcript.jsx').match(/export function containedImageSource[\s\S]*?\n\}/)[0], /fileUrlOf/);
});
