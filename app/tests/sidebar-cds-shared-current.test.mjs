import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// SG-2: code-current carries no 2.37337.1 CDS copy any more. The sidebar's density context, Badge, Pulse,
// Base UI mergeProps and clsx are the view-tabs 2.42304.0 originals, so Badge and CdsButton read one context.
// Only source text, the generated output and SSR are inspected; no app window is opened.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let server, Frame, Vendor, Badge, Merge, Nav, Status;
before(async () => {
  server = await createServer({ configFile:false, root:app, plugins:[react()], server:{middlewareMode:true,hmr:false,watch:null}, appType:'custom', logLevel:'error' });
  Frame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  Vendor = await server.ssrLoadModule('/src/generated/view-tabs/vendor-frame-DfPJ1QmD.js');
  Badge = await server.ssrLoadModule('/src/generated/code-current/cds-badge.mjs');
  Merge = await server.ssrLoadModule('/src/generated/code-current/cds-merge-props.mjs');
  Nav = await server.ssrLoadModule('/src/generated/code-current/sidebar-nav-badge.mjs');
  Status = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
});
after(() => server?.close());
const entry = target => manifest.modules.find(module => module.target === target);
const h = React.createElement;

test('cds-badge and cds-merge-props re-export the view-tabs 2.42304.0 originals instead of copying them', () => {
  assert.equal(Badge.CdsBadgeDensity, Frame.CdsDensityContext);
  assert.equal(Badge.CurrentCdsBadge, Frame.CdsBadge);
  assert.equal(Badge.CurrentPulse, Frame.CdsPulse);
  assert.equal(Merge.mergeCdsProps, Vendor.mergeProps);
  assert.equal(Merge.cdsClassNames, Vendor.clsx);
  // The sidebar chunks import vendor-frame ge (clsx) as their joiner, not CDS X (twMerge): no class is dropped.
  assert.equal(Merge.cdsClassNames('px-2', false, ['px-4', { 'ms-2': true, hidden: false }]), 'px-2 px-4 ms-2');
  assert.equal(Frame.cdsClassNames('px-2', 'px-4'), 'px-4');
  for (const target of ['cds-badge.mjs', 'cds-merge-props.mjs']) {
    const module = entry(target), text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(module.referenceVersion, '2.42304.0', target);
    assert.deepEqual(module.bindings, [], target);
    assert.equal(sha(readFileSync(path.join(latest, path.basename(module.source)))), module.sourceSha256, target);
    assert.match(text, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
    assert.doesNotMatch(text, /createContext|forwardRef|function |var /, `${target} holds no copied declaration`);
  }
  // The 2.42304.0 status glyph (step 2) takes the Pulse (eN) straight from view-tabs by its semantic name; the shim's
  // CurrentPulse is that same function for anything still importing it.
  assert.match(readFileSync(path.join(generated, 'sidebar-status-glyph.mjs'), 'utf8'), /CdsPulse as xf\b[^;]*from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js"/);
  assert.equal(typeof Status.SidebarStatusGlyph, 'function');
});

test('the sidebar and its rows provide the same CDS density context the Badge and CdsButton read', () => {
  const host = file => readFileSync(path.join(app, 'src', file), 'utf8');
  assert.match(host('source-sidebar.jsx'), /import \{ CdsDensityContext as CdsBadgeDensity \} from '\.\/generated\/view-tabs\/shared-frame-BfjMqbuN\.js';/);
  assert.match(host('source-code-sidebar-row.jsx'), /import \{ CdsDensityContext as SidebarCdsDensity \} from '\.\/generated\/view-tabs\/shared-frame-BfjMqbuN\.js';/);
  assert.doesNotMatch(host('source-sidebar.jsx'), /code-current\/cds-badge\.mjs/);
  const pair = (Provider, density) => renderToStaticMarkup(h(Provider, { value:density },
    h(Nav.SidebarNavBadge, { badge:'beta' }),
    h(Frame.CdsButton, { variant:'ghost', size:'xs', iconOnly:true, icon:'DotsHorizontal', tooltip:false, 'aria-label':'More' })));
  // One Provider, compact and comfortable: Badge picks its compact xs line box, the Button its 12px optical icon.
  for (const Provider of [Badge.CdsBadgeDensity, Frame.CdsDensityContext]) {
    const compact = pair(Provider, 'compact'), comfortable = pair(Provider, 'comfortable');
    assert.match(compact, /data-cds="Badge" data-size="xs"[^>]*bg-neutral text-secondary ms-2/);
    assert.match(compact, /leading-\[calc\(0\.75rem\*var\(--cds-rem-scale,1\)\)\] py-\[0\.125em\] -my-\[0\.125em\]">Beta<\/span>/);
    assert.match(compact, /data-cds="Button"[\s\S]*font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)/);
    assert.match(comfortable, /class="pb-\[0\.05em\]">Beta<\/span>/);
    assert.doesNotMatch(comfortable, /py-\[0\.125em\] -my-\[0\.125em\]/);
    assert.match(comfortable, /data-cds="Button"[\s\S]*font-size:calc\(1rem \* var\(--cds-rem-scale, 1\)\)/);
  }
});

test('pure-renamed sidebar helpers are extracted from the installed 2.42304.0 chunks with their export names kept', () => {
  const sources = {
    'sidebar-upgrade-badge.mjs':'shared-3-DnHYUZdJ.js', 'sidebar-nav-badge.mjs':'shared-21-IP-SVetq.js', 'sidebar-session-state.mjs':'shared-8-B5lJ8U5C.js',
    'sidebar-pr-model.mjs':'shared-18-D4XxL6Tg.js', 'sidebar-pr-icon.mjs':'shared-18-D4XxL6Tg.js', 'sidebar-remote-name.mjs':'shared-104-Cqo2-vQh.js',
    'sidebar-environment-copy.mjs':'shared-78-D6VXYXaQ.js', 'sidebar-family-sort.mjs':'shared-21-IP-SVetq.js', 'sidebar-date-pivot.mjs':'shared-22-HztmyUTM.js',
    'sidebar-date-groups.mjs':'shared-22-HztmyUTM.js', 'sidebar-sort-model.mjs':'shared-11-BuQ3CK5I.js', 'sidebar-group-copy.mjs':'shared-18-D4XxL6Tg.js',
    'sidebar-menu-groups.mjs':'shared-16-B0xHzPjj.js', 'sidebar-menu-order.mjs':'shared-19-CkPOiIKm.js',
  };
  const exportsOf = text => [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map(item => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)).sort();
  const expected = {
    'sidebar-family-sort.mjs':['orderSidebarFamilies','sidebarFamilyHead','sidebarFamilyPivot','splitSidebarFamilies'],
    'sidebar-menu-groups.mjs':['OrderedSidebarMenuGroups','RegisterSidebarMenuRow','SidebarMenuItem','SidebarMenuSection'],
    'sidebar-sort-model.mjs':['compareSidebarCreated','compareSidebarTitle','compareSidebarUpdated','sidebarCreatedTimestamp'],
    'sidebar-pr-model.mjs':['aggregatePullRequests','prStateOrder','prWebUrl','pullRequestEntries','resolvePrState'],
  };
  for (const [target, file] of Object.entries(sources)) {
    const module = entry(target), text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(module.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(module.source), file, target);
    assert.match(module.source, /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\//, target);
    assert.equal(sha(readFileSync(path.join(latest, file))), module.sourceSha256, target);
    assert.equal(sha(text), module.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 2.42304.0 bindings'), target);
    assert.doesNotMatch(text, /cds-badge\.mjs|cds-merge-props\.mjs/, `${target} imports CDS from view-tabs directly`);
    if (expected[target]) assert.deepEqual(exportsOf(text), expected[target], target);
  }
  // Minified locals were shuffled between versions (old QR/$R/iz/oz are now $R/ez/az/sz): pin the original roles.
  const family = readFileSync(path.join(generated, 'sidebar-family-sort.mjs'), 'utf8');
  assert.match(family, /export \{\s*\$R as sidebarFamilyPivot,\s*ez as sidebarFamilyHead,\s*az as orderSidebarFamilies,\s*sz as splitSidebarFamilies,?\s*\}/);
});

test('the 2.42304.0 navigation badge keeps New, Beta, Preview and upgrade and still drops lab labels', () => {
  const badge = value => renderToStaticMarkup(h(Frame.CdsDensityContext, { value:'compact' }, h(Nav.SidebarNavBadge, { badge:value })));
  assert.equal(badge(undefined), ''); assert.equal(badge('lab'), '');
  assert.match(badge('new'), /data-cds="Badge"[^>]*bg-tint-blue text-accent[^>]*>.*New/);
  assert.match(badge('new'), /whitespace-nowrap/);
  assert.match(badge('beta'), />Beta<\/span>/);
  assert.match(badge('preview'), />Preview<\/span>/);
  assert.match(badge('upgrade'), /<span data-inline-badge="" class="contents"><span class="border-0\.5 border-border-400 text-accent px-1\.5 py-px rounded-3xl font-small ms-auto me-0\.5">Upgrade<\/span><\/span>/);
});
