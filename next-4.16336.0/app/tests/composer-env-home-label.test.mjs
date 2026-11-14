// composer lane (surfaces-prod-3, 4.16336.0): the composer environment bar's ~ paths read under the official home label
// context — cd8a7d7c0 y (Jge `ae = rT()`, export i) over the module store u = $v(l()), l() = window.desktopHomePath —
// linked from src/generated/code-routines-v4 (one instance, D1), with the host setting window.desktopHomePath in
// electron/preload.cjs from main.cjs's first-paint payload (the official managed-config homePath, app.getPath("home")).
// The store reads window.desktopHomePath once, when cd8a7d7c0 evaluates; under SSR there is no window (l() is undefined,
// every path reads in full, tests/w14-code-r2-composer.test.mjs) and d() = ty(u, f) answers useSyncExternalStore's server
// snapshot from f (no home), so this file checks the store itself through its official read / set (shared-92 $v) and the
// preload wiring as text; the client read (~ paths) is the GUI acceptance's.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
// router store (reads window.location.pathname at load), as in the app.
// W8 stub contract (design class c): cds-core now holds shared-92 cS, which reads documentElement.hasAttribute at load.
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { hasAttribute: () => false, dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
const HOME = '/Users/fixture';
let server, React, render, load;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());

test('the official store: cd8a7d7c0 y reads the store u into { home }; p is the no-home context', async () => {
  const label = await load('/src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs');
  assert.equal(label.l(), undefined, 'no window under SSR');
  assert.deepEqual(label.p, {});
  assert.equal(label.f(), undefined, 'the server snapshot names no home');
  let seen;
  const Probe = () => { seen = label.y(); return null; };
  render(React.createElement(Probe));
  assert.deepEqual(seen, { home: undefined });
  assert.equal(label.u.read(), undefined);
  label.u.set(HOME);
  assert.equal(label.u.read(), HOME, 'the store the client snapshot reads');
  render(React.createElement(Probe));
  assert.deepEqual(seen, { home: undefined }, 'SSR keeps the server snapshot');
  label.u.set(undefined);
  const text = read('src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs');
  assert.match(text, /let e = window\.desktopHomePath;\n\s+return typeof e == "string" && e !== "" \? e : void 0;/);
  assert.match(text, /var u = s\(l\(\)\);\nfunction d\(\) \{\n\s+return o\(u, f\);/);
});

test('the adapters re-export the linked y / p, keep no store, and read paths through shared-3 VM', async () => {
  const adapters = await load('/src/source-composer-env-adapters.jsx');
  const label = await load('/src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs');
  assert.equal(adapters.useHomeLabelContext, label.y, 'the official hook itself, not a copy');
  assert.equal(adapters.noHomeLabelContext, label.p);
  assert.equal(adapters.environmentPathLabel(`${HOME}/code/app`, { home: HOME }), '~/code/app');
  assert.equal(adapters.environmentPathLabel(`${HOME}/code/app`), `${HOME}/code/app`, 'no label context: the full path');
  const text = read('src/source-composer-env-adapters.jsx');
  assert.match(text, /^import \{ p as officialNoHomeLabelContext, y as officialHomeLabelContext \} from '\.\/generated\/code-routines-v4\/cd8a7d7c0-DuH0T8rm\.mjs';$/m);
  assert.doesNotMatch(text, /useSyncExternalStore|createContext|^let /m, 'no host store or context');
});

test('the gone line and the folder menu group read ~ paths under the official context, with no home prop', async () => {
  const { EnvironmentGoneLine } = await load('/src/source-composer-environment-bar.jsx');
  const html = render(React.createElement(EnvironmentGoneLine, { name: 'App', folder: `${HOME}/src/app`, onEdit: () => {} }));
  assert.match(html, /^App can’t start: \/Users\/fixture\/src\/app no longer exists\. /, 'SSR: the server snapshot, paths in full');
  assert.match(read('src/source-composer-environment-bar.jsx'), /export function EnvironmentGoneLine\(\{ name, folder, onEdit \}\) \{\n\s+const intl = useStartIntl\(\);\n(?:\s+\/\/[^\n]*\n)+\s+const labelContext = useHomeLabelContext\(\);/);
  const { AlsoIncludedGroup } = await load('/src/source-composer-folder-menu.jsx');
  assert.match(read('src/source-composer-folder-menu.jsx'), /export function AlsoIncludedGroup\(\{ folders = \[\], onRemove \}\) \{\n\s+const labelContext = useHomeLabelContext\(\);/);
  assert.equal(typeof AlsoIncludedGroup, 'function');
});

test('the host sets window.desktopHomePath before the renderer runs; EnvironmentHostHome and the home props are gone', () => {
  const main = read('electron/main.cjs'), preload = read('electron/preload.cjs');
  assert.match(main, /preferredLanguages: preferredSystemLanguages\(app\.getPreferredSystemLanguages\(\)\), homePath: app\.getPath\("home"\) \};/);
  assert.match(preload, /try \{ appearance = ipcRenderer\.sendSync\("desktop:appearance"\) \?\? null; \} catch \{\}\n(?:\/\/[^\n]*\n)+try \{ if \(typeof appearance\?\.homePath === "string" && appearance\.homePath !== ""\) contextBridge\.exposeInMainWorld\("desktopHomePath", appearance\.homePath\); \} catch \{\}/);
  const renderer = read('src/main.jsx');
  for (const file of ['src/main.jsx', 'src/source-composer-environment-bar.jsx', 'src/source-composer-folder-menu.jsx', 'src/source-composer-env-adapters.jsx'])
    assert.doesNotMatch(read(file), /EnvironmentHostHome|useEnvironmentHome|setHostHomePath/, file);
  assert.doesNotMatch(renderer, /<EnvironmentGoneLine [^\n]*home=/);
  assert.doesNotMatch(renderer, /onRemoveFolder=\{[^\n]*\} home=\{boot\?\.host\?\.home\}/);
  // relink C3: the Code start rows (cc43287c9 dxe `Dye({items:nr,labelContext:Qt,…})`, Qt = rT() = cd8a7d7c0 y) and the
  // gone-folder send block (`_n=gn?Qt:iT`, gn = local / wsl) read the official context too; no host home in any path label.
  const start = read('src/source-code-start.jsx');
  assert.match(start, /^import \{ useHomeLabelContext \} from '\.\/source-composer-env-adapters\.jsx';$/m);
  assert.match(start, /export function SourceCodeStart\(\{ ready, folders, folder, onSelect, /);
  assert.doesNotMatch(start.slice(start.indexOf('export function SourceCodeStart(')), /\bhome\s*[:=,}]|home \|\|/);
  assert.match(start, /\n  const intl = useStartIntl\(\);\n  const labelContext = useHomeLabelContext\(\);\n/);
  assert.match(start, /startEnvironmentRows\(\{ items: startEnvironmentItems\(savedEnvironments, folders\), labelContext,\n/);
  assert.doesNotMatch(renderer.slice(renderer.indexOf('<SourceCodeStart '), renderer.indexOf('/>', renderer.indexOf('<SourceCodeStart '))), /\bhome=/);
  assert.match(renderer, /^import \{ environmentPathLabel, useHomeLabelContext \} from "\.\/source-composer-env-adapters\.jsx";$/m);
  assert.equal(renderer.split('const homeLabelContext = useHomeLabelContext();').length - 1, 1);
  assert.ok(renderer.includes('path: environmentPathLabel(selectedEnvironment.target.cwd, homeLabelContext) });'));
  // What is left of boot.host.home in main.jsx is the two IPC payloads' homePath (not a label).
  assert.deepEqual([...renderer.matchAll(/(\w+): boot\?\.host\?\.home\b|boot\?\.host\?\.home/g)].map((m) => m[1] ?? m[0]), ['homePath', 'homePath']);
});
