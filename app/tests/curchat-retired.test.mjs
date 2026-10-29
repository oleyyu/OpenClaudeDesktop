// w10-curchat-retire (research/w10-curchat.md CC-12 / CC-13 / CC-14 / CC-16): the 2.31226.0 current-chat slice is
// retired. Its consumers moved to 3.6556.2 folders first (w10-curchat-composer -> code-composer, -home-host ->
// cowork-home / cowork-progress, -artifacts-host -> artifact-library, -projects -> chat-projects); this lane removed the
// generator (extract-current-chat-ui.mjs), its check-and-prepare script (prepare-current-chat-ui.mjs, which also wrapped
// the 2.31226.0 c6a992d55-C0zTICcS.css into public/assets/current-chat/layout.css), the generated folder, the
// stylesheet link and the root's second CDS labels provider. Source only: file text and import ASTs; nothing runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';

const app = path.resolve(import.meta.dirname, '..');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const walk = (dir, pattern) => fs.readdirSync(path.join(app, dir), { recursive: true }).map(name => `${dir}/${String(name).split(path.sep).join('/')}`)
  .filter(rel => pattern.test(rel) && fs.statSync(path.join(app, rel)).isFile());

// Every module specifier of a file: static import / export-from, dynamic import(), and CJS require() string literals.
function specifiers(rel) {
  const program = parseAst(local(rel), { lang: rel.endsWith('.jsx') ? 'jsx' : 'js' }, rel);
  const out = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) && node.source?.type === 'Literal') out.push(node.source.value);
    if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === 'require' && node.arguments[0]?.type === 'Literal') out.push(node.arguments[0].value);
    for (const key of Object.keys(node)) if (key !== 'type' && node[key] && typeof node[key] === 'object') visit(node[key]);
  };
  visit(program.body);
  return out.filter(spec => typeof spec === 'string');
}

test('the generator, the prepare script, the generated folder and the scoped stylesheet are gone', () => {
  for (const rel of ['scripts/extract-current-chat-ui.mjs', 'scripts/prepare-current-chat-ui.mjs', 'src/generated/current-chat', 'public/assets/current-chat'])
    assert.equal(fs.existsSync(path.join(app, rel)), false, rel);
  // prepare-ui.mjs no longer imports the prepare script (it ran the source/output sha check and wrote layout.css).
  assert.doesNotMatch(local('scripts/prepare-ui.mjs'), /current-chat/);
});

test('index.html links no current-chat/layout.css: Chat / Cowork surfaces read only the 3.6556.2 sheets and the compatibility layer', () => {
  const html = local('index.html');
  assert.doesNotMatch(html, /current-chat/);
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)" \/>/g)].map(m => m[1]);
  assert.equal(links.at(-1), '/assets/legacy-utilities.css');
  assert.equal(links.filter(href => href.startsWith('/assets/v1/')).length, 5);
  // No local sheet restates the removed 2.31226.0 @scope root either.
  for (const rel of walk('src', /\.css$/)) assert.doesNotMatch(local(rel), /data-chat-source-version="2\.31226\.0"/, rel);
});

test('no module under src/, electron/ or scripts/ imports a current-chat path', () => {
  const files = [...walk('src', /\.(m?js|jsx)$/), ...walk('electron', /\.(c?js|mjs)$/), ...walk('scripts', /\.(m?js)$/)];
  assert.ok(files.length > 500, String(files.length));
  const hits = files.flatMap(rel => specifiers(rel).filter(spec => /current-chat/.test(spec)).map(spec => `${rel} -> ${spec}`));
  assert.deepEqual(hits, []);
  // And no generated folder still carries the folder name in its code (a shim or an adapter row pointing back).
  const generated = walk('src/generated', /\.(m?js|json)$/).filter(rel => /generated\/current-chat\//.test(local(rel)));
  assert.deepEqual(generated, []);
});

test('main.jsx provides the view-tabs labels context only (CC-13)', () => {
  const main = local('src/main.jsx');
  assert.doesNotMatch(main, /CurrentChatCdsLabelsContext/);
  // The view-tabs locale context wraps it on the outside (CdsLocaleContext, the CDS formatters' locale).
  assert.match(main, /\n {2}<CdsLocaleContext\.Provider value=\{getLocale\(\)\}><CdsLabelsContext\.Provider value=\{cdsLabels\}><SourceToastProvider><SourceFileEditGuard \/>/);
  assert.match(main, /<\/SourceToastProvider><\/CdsLabelsContext\.Provider><\/CdsLocaleContext\.Provider>,\n\);/);
});

test('the chat folder no longer writes the E34 shims current-chat imported (vendor-intl $t, shared-frame X, shared-8 vl)', () => {
  const manifest = JSON.parse(local('src/generated/chat/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.deepEqual(manifest.legacy ?? {}, {});
  for (const file of ['vendor-intl-Cf4IuK3L.js', 'shared-frame-C_2npUJq.js', 'shared-8-B5xbG2px.js'])
    assert.equal(fs.existsSync(path.join(app, 'src/generated/chat', file)), false, file);
  // en (FormattedRelativeTime) was emitted only for the legacy $t, so its HomeRelativeTime adapter import went with it.
  assert.equal(Object.hasOwn(manifest.publicNames, 'FormattedRelativeTime'), false);
  assert.doesNotMatch(local('src/generated/chat/vendor-intl-DYfox5Co.js'), /source-home-adapters\.jsx/);
});
