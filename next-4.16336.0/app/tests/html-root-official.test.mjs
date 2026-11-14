import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { snapshotRoot } from '../scripts/official-4.16336.0.mjs';
import { designEntryStylesheets } from '../scripts/current-design-assets.mjs';

// html-root (integration-2): app/index.html's <html> carries the 4.16336.0 ion-dist/index.html root attributes the
// renderer reads (official tag at byte 15 of the snapshot index.html). Build stamps stay out (they describe the official
// SPA build, not this one); data-platform / data-dframe are the host's own (CdsRoot / shared-22 write them at runtime in
// the official app).
const app = path.resolve(import.meta.dirname, '..');
const officialHtml = readFileSync(path.join(snapshotRoot, 'ion-dist/index.html'), 'utf8');
const hostHtml = readFileSync(path.join(app, 'index.html'), 'utf8');
const rootAttributes = (html) => {
  const tag = /<html\b([^>]*)>/i.exec(html)?.[1] ?? '';
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(([, key, value]) => [key, value ?? '']));
};
const official = rootAttributes(officialHtml), host = rootAttributes(hostHtml);

const ADOPTED = ['data-color-version', 'data-cds-fizzy-lake', 'data-document-variant', 'data-entry-document', 'lang', 'data-theme', 'data-mode', 'data-density', 'class'];
const BUILD_STAMPS = ['data-build-id', 'data-git-hash', 'data-build-timestamp', 'data-version', 'data-env', 'data-browser-floor'];
const HOST_ONLY = { 'data-platform': 'desktop', 'data-dframe': '' };

test('the official <html> attributes are exactly the adopted ones plus the build stamps', () => {
  assert.equal(officialHtml.indexOf('<html '), 15);
  assert.deepEqual(Object.keys(official).sort(), [...ADOPTED, ...BUILD_STAMPS].sort());
});

test('app/index.html carries every adopted attribute with the official value', () => {
  for (const key of ADOPTED) assert.equal(host[key], official[key], key);
  assert.equal(host['data-cds-fizzy-lake'], 'color panels type');
  assert.equal(host.class, 'cds-root h-screen antialiased motion-safe:scroll-smooth');
  assert.equal(host['data-document-variant'], 'full');
  assert.equal(host['data-entry-document'], 'app');
});

test('build stamps stay out; the host-only attributes stay', () => {
  for (const key of BUILD_STAMPS) assert.equal(key in host, false, key);
  for (const [key, value] of Object.entries(HOST_ONLY)) assert.equal(host[key], value, key);
  assert.deepEqual(Object.keys(host).sort(), [...ADOPTED, ...Object.keys(HOST_ONLY)].sort());
});

test('the linked c6a992d55 entry sheet keys 1090 selectors on the attribute and defines the root utilities', () => {
  const name = designEntryStylesheets.find((file) => file.startsWith('c6a992d55-'));
  assert.ok(hostHtml.includes(`<link rel="stylesheet" href="/assets/v1/${name}" />`), name);
  const css = readFileSync(path.join(app, 'public/assets/v1', name), 'utf8');
  const parts = {};
  for (const [, part] of css.matchAll(/\[data-cds-fizzy-lake~=(\w+)\]/g)) parts[part] = (parts[part] ?? 0) + 1;
  assert.deepEqual(parts, { color: 804, panels: 169, type: 117 });
  assert.ok(css.includes('.h-screen{height:100dvh}'));
  assert.ok(css.includes('.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}'));
  assert.ok(css.includes('.motion-safe\\:scroll-smooth:not(:where([data-reduce-motion=true],[data-reduce-motion=true] *)){scroll-behavior:smooth}'));
});

test('JS readers: the official shared-92 reader (Qy/nb/ib/ab) sees all three parts; the 3.6556.2 shared-52 allow-list keeps them off', () => {
  // 4.16336.0 ion-dist/assets/v1/shared-92-BOgyxePb.js (JS string index) :122531 Qy=["color","panels","type"], nb=Qy,
  // :122725 ib() reads html[data-cds-fizzy-lake] once per page through eb(attr, nb). The reader is checked and run from
  // the official text, not from the generated cds-core module (wave 4 renames its export; tests stay off cds-core's raw names).
  const shared92 = readFileSync(path.join(snapshotRoot, 'ion-dist/assets/v1/shared-92-BOgyxePb.js'), 'utf8');
  const from = shared92.indexOf('Qy=["color","panels","type"],$y="data-cds-fizzy-lake";');
  const to = shared92.indexOf('function ob(e){', from);
  assert.equal(from, 122531);
  const reader = shared92.slice(from, to);
  assert.equal(reader, 'Qy=["color","panels","type"],$y="data-cds-fizzy-lake";function eb(e,t){let n=new Set(e?.split(" "));return t.filter(e=>n.has(e)).sort()}'
    + 'function tb(e){return[...e].sort().join(" ")}var nb=Qy,rb;function ib(){return rb??={parts:typeof document>"u"?[]:eb(document.documentElement.getAttribute($y),nb)},rb}'
    + 'function ab(e){return ib().parts.includes(e)}');
  assert.equal(shared92.indexOf('function ib(){'), 122725);
  const document = { documentElement: { getAttribute: (name) => host[name] ?? null } };
  const officialReader = new Function('document', `var ${reader};return ab;`)(document);
  for (const part of ['color', 'panels', 'type']) assert.equal(officialReader(part), true, part);
  assert.equal(officialReader('density'), false);
  // view-tabs shared-52 (3.6556.2) filters the attribute through its empty allow-list Qm, so th / isFizzyLakePartOptedIn
  // stays false for every part and the 3.6556.2 regions keep their fizzy-lake-off branches (E12).
  const legacy = readFileSync(path.join(app, 'src/generated/view-tabs/shared-52-uHFNjl7C.js'), 'utf8');
  assert.ok(legacy.includes('var Qm=[];'));
  assert.ok(legacy.includes('function eh(){return $m??={parts:typeof document>"u"?[]:Xm(document.documentElement.getAttribute(Ym),Qm)},$m}'));
  assert.ok(legacy.includes('function th(e){return eh().parts.includes(e)}'));
  assert.match(legacy, /th as isFizzyLakePartOptedIn\}/);
});

test('type part: Large message rows restate the official fizzy-lake type leading 1.46667 over the transcript spacing', () => {
  const name = designEntryStylesheets.find((file) => file.startsWith('c6a992d55-'));
  const official = readFileSync(path.join(snapshotRoot, 'ion-dist/assets/v1', name), 'utf8');
  const type = '.cds-root:is([data-cds-fizzy-lake~=type],[data-cds-fizzy-lake~=type] *)[data-chat-text-size=l] .epitaxy-transcript-typography';
  const rows = `${type} [data-transcript-row] [data-cds=AssistantMessage][data-turn-key],${type} [data-transcript-row] [data-cds=UserMessage][data-turn-key],${type} [data-code-own-row]{--chat-leading:1.46667}`;
  assert.equal(official.indexOf(rows), 1822302);
  assert.equal(official.indexOf('[data-chat-text-size=s] .epitaxy-transcript-typography{'), 1698342);
  assert.equal(official.indexOf('[data-chat-text-size=l] .epitaxy-transcript-typography{--chat-body:calc(1rem * var(--cds-rem-scale,1));--chat-leading:1.375}'), 1698470);
  const settings = readFileSync(path.join(app, 'src/source-settings.css'), 'utf8');
  assert.ok(settings.includes('html[data-cds-fizzy-lake~=type][data-chat-text-size=l] .source-message.source-message:is([data-cds=AssistantMessage],[data-cds=UserMessage]) { --chat-leading:1.46667; --chat-item-gap:calc(var(--chat-body)*1.375*.5); --chat-turn-gap:calc(var(--chat-body)*1.375*.75); }'));
  assert.equal(host['data-cds-fizzy-lake'].split(' ').includes('type'), true);
});
