import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// SG-2: code-current carries no CDS copy. The sidebar's density context, Badge, Pulse, Base UI mergeProps and clsx are
// the view-tabs originals (3.6556.2 since w2-sidebar-current-a; the 2.42304.0 legacy shims are retired since W7),
// so Badge and CdsButton read one context. Only source text, the generated output and SSR are inspected; no app window.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const directoryFor = version => ({ '2.42304.0': latest, '3.6556.2': v3 })[version];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let server, Frame, Vendor, Badge, Merge, Nav, Status;
before(async () => {
  server = await createServer({ configFile:false, root:app, plugins:[react()], server:{middlewareMode:true,hmr:false,watch:null}, appType:'custom', logLevel:'error' });
  Frame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  Vendor = await server.ssrLoadModule('/src/generated/view-tabs/vendor-frame-CnSY1sxv.js');
  Badge = await server.ssrLoadModule('/src/generated/code-current/cds-badge.mjs');
  Merge = await server.ssrLoadModule('/src/generated/code-current/cds-merge-props.mjs');
  Nav = await server.ssrLoadModule('/src/generated/code-current/sidebar-nav-badge.mjs');
  Status = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
});
after(() => server?.close());
const entry = target => manifest.modules.find(module => module.target === target);
const h = React.createElement;

test('cds-badge and cds-merge-props re-export the view-tabs 3.6556.2 originals instead of copying them', () => {
  assert.equal(Badge.CdsBadgeDensity, Frame.CdsDensityContext);
  assert.equal(Badge.CurrentCdsBadge, Frame.CdsBadge);
  assert.equal(Badge.CurrentPulse, Frame.CdsPulse);
  assert.equal(Merge.mergeCdsProps, Vendor.mergeProps);
  assert.equal(Merge.cdsClassNames, Vendor.clsx);
  // W7: the 2.42304.0 file-name shims are retired, so every importer reaches these instances through the current files.
  for (const old of ['shared-frame-BfjMqbuN.js', 'vendor-frame-DfPJ1QmD.js']) assert.equal(existsSync(path.join(app, 'src/generated/view-tabs', old)), false, old);
  // The sidebar chunks import vendor-frame ge (clsx) as their joiner, not CDS X (twMerge): no class is dropped.
  assert.equal(Merge.cdsClassNames('px-2', false, ['px-4', { 'ms-2': true, hidden: false }]), 'px-2 px-4 ms-2');
  assert.equal(Frame.cdsClassNames('px-2', 'px-4'), 'px-4');
  for (const target of ['cds-badge.mjs', 'cds-merge-props.mjs']) {
    const module = entry(target), text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(module.referenceVersion, '3.6556.2', target);
    assert.deepEqual(module.bindings, [], target);
    assert.equal(sha(readFileSync(path.join(v3, path.basename(module.source)))), module.sourceSha256, target);
    assert.match(text, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
    assert.match(text, /from "\.\.\/view-tabs\/(?:shared-frame-6jtSkIit|vendor-frame-CnSY1sxv)\.js"/, target);
    assert.doesNotMatch(text, /createContext|forwardRef|function |var /, `${target} holds no copied declaration`);
  }
  // The 3.6556.2 status glyph (shared-18 JO) takes the Pulse (shared-frame mL) straight from view-tabs by its semantic
  // name; the shim's CurrentPulse is that same function for anything still importing it.
  assert.match(readFileSync(path.join(generated, 'sidebar-status-glyph.mjs'), 'utf8'), /CdsPulse as B\b[^;]*from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js"/);
  assert.equal(typeof Status.SidebarStatusGlyph, 'function');
});

test('the sidebar and its rows provide the same CDS density context the Badge and CdsButton read', () => {
  const host = file => readFileSync(path.join(app, 'src', file), 'utf8');
  assert.match(host('source-sidebar.jsx'), /import \{ CdsDensityContext as CdsBadgeDensity \} from '\.\/generated\/view-tabs\/index\.js';/);
  // R6: the row reaches the density context through the view-tabs facade; it is the shim's same Context instance
  // (asserted at runtime in sidebar-row-current).
  assert.match(host('source-code-sidebar-row.jsx'), /import \{ CdsDensityContext as SidebarCdsDensity \} from '\.\/generated\/view-tabs\/index\.js';/);
  assert.doesNotMatch(host('source-sidebar.jsx'), /code-current\/cds-badge\.mjs/);
  const pair = (Provider, density) => renderToStaticMarkup(h(Provider, { value:density },
    h(Nav.SidebarNavBadge, { badge:'beta' }),
    h(Frame.CdsButton, { variant:'ghost', size:'xs', iconOnly:true, icon:'DotsHorizontal', tooltip:false, 'aria-label':'More' })));
  // One Provider, compact and comfortable: Badge picks its compact xs line box, the Button its 12px optical icon.
  for (const Provider of [Badge.CdsBadgeDensity, Frame.CdsDensityContext]) {
    const compact = pair(Provider, 'compact'), comfortable = pair(Provider, 'comfortable');
    // 3.6556.2 Badge keeps its inert fizzy-lake `stacks:` variant classes (E12) between the tone and the host class.
    assert.match(compact, /data-cds="Badge" data-size="xs"[^>]*bg-neutral text-secondary(?: stacks:[^ "]+)* ms-2"/);
    assert.match(compact, /leading-\[calc\(0\.75rem\*var\(--cds-rem-scale,1\)\)\] py-\[0\.125em\] -my-\[0\.125em\]">Beta<\/span>/);
    assert.match(compact, /data-cds="Button"[\s\S]*font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)/);
    assert.match(comfortable, /class="pb-\[0\.05em\]">Beta<\/span>/);
    assert.doesNotMatch(comfortable, /py-\[0\.125em\] -my-\[0\.125em\]/);
    assert.match(comfortable, /data-cds="Button"[\s\S]*font-size:calc\(1rem \* var\(--cds-rem-scale, 1\)\)/);
  }
});

test('sidebar helpers are extracted from the official chunks with their export names kept', () => {
  // w2-sidebar-current-a targets read 3.6556.2 (research/sidebar.md §1.2/§1.3; shared-104 ez moved to shared-78 C4).
  const v3Sources = {
    'sidebar-upgrade-badge.mjs':'shared-3-BCEbd8Fv.js', 'sidebar-nav-badge.mjs':'shared-21-R7LldJ05.js', 'sidebar-session-state.mjs':'shared-8-Db1QN4mf.js',
    'sidebar-session-priority.mjs':'shared-26-CGuBxVt9.js', 'sidebar-pr-model.mjs':'shared-18-D3y8YMFN.js', 'sidebar-pr-icon.mjs':'shared-18-D3y8YMFN.js',
    'sidebar-remote-name.mjs':'shared-78-D5Fw2h0a.js', 'sidebar-environment-copy.mjs':'shared-78-D5Fw2h0a.js', 'sidebar-row-primitive.mjs':'shared-18-D3y8YMFN.js',
    'sidebar-pr-card.mjs':'shared-20-mUr7IqZY.js', 'sidebar-details-model.mjs':'shared-20-mUr7IqZY.js', 'sidebar-details-view.mjs':'shared-20-mUr7IqZY.js',
    'sidebar-status-glyph.mjs':'shared-18-D3y8YMFN.js', 'sidebar-fade-label.mjs':'shared-18-D3y8YMFN.js', 'sidebar-row-view.mjs':'shared-18-D3y8YMFN.js',
  };
  // w2-sidebar-current-b targets migrate in their own lane: whichever version they read, the source must match it.
  const otherSources = {
    'sidebar-family-sort.mjs':'shared-21', 'sidebar-date-pivot.mjs':'shared-22', 'sidebar-date-groups.mjs':'shared-22', 'sidebar-sort-model.mjs':'shared-11',
    'sidebar-group-copy.mjs':'shared-18', 'sidebar-menu-groups.mjs':'shared-16', 'sidebar-menu-order.mjs':'shared-',
  };
  const sources = { ...v3Sources, ...otherSources };
  const exportsOf = text => [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map(item => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)).sort();
  const expected = {
    'sidebar-family-sort.mjs':['orderSidebarFamilies','sidebarFamilyHead','sidebarFamilyPivot','splitSidebarFamilies'],
    'sidebar-menu-groups.mjs':['OrderedSidebarMenuGroups','RegisterSidebarMenuRow','SidebarMenuItem','SidebarMenuSection'],
    'sidebar-sort-model.mjs':['compareSidebarCreated','compareSidebarTitle','compareSidebarUpdated','sidebarCreatedTimestamp'],
    'sidebar-pr-model.mjs':['aggregatePullRequests','prStateOrder','prWebUrl','pullRequestEntries','resolvePrState'],
    'sidebar-session-state.mjs':['resolveSessionDisplayState','sessionNeedsAttention'],
    'sidebar-session-priority.mjs':['resolveSessionStatePriority','sessionStatePriorities'],
    'sidebar-remote-name.mjs':['sidebarRemoteName'],
    'sidebar-row-view.mjs':['CurrentSidebarRow','SidebarRenameInput','SidebarRowMoreControl','SidebarWideDecoration','sidebarRowClasses','useSidebarRename'],
    'sidebar-status-glyph.mjs':['SidebarStatusGlyph','SidebarStatusLabel','SidebarStatusLayout','SidebarStatusTooltips','sidebarErrorColors','sidebarErrorKind','sidebarErrorShapes','sidebarStatusMessages','useSidebarStatusTooltips'],
  };
  for (const [target, file] of Object.entries(sources)) {
    const module = entry(target), text = readFileSync(path.join(generated, target), 'utf8');
    const version = v3Sources[target] ? '3.6556.2' : module.referenceVersion, directory = directoryFor(version);
    assert.equal(module.referenceVersion, version, target);
    assert.ok(directory, `${target} reads a known release (${version})`);
    if (v3Sources[target]) assert.equal(path.basename(module.source), file, target);
    else assert.ok(path.basename(module.source).startsWith(file), target);
    assert.match(module.source, version === '3.6556.2' ? /snapshots\/claude-3\.6556\.2-20261025-192807\/ion-dist\/assets\/v1\// : /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\//, target);
    assert.equal(sha(readFileSync(path.join(directory, path.basename(module.source)))), module.sourceSha256, target);
    assert.equal(sha(text), module.sha256, target);
    assert.ok(text.startsWith(`// Original Claude Desktop ${version} bindings`), target);
    // No view-tabs import by minified name and none from a stale 2.42304.0 file name in the migrated targets (R6).
    if (v3Sources[target]) assert.doesNotMatch(text, /view-tabs\/(?:shared-frame-BfjMqbuN|vendor-frame-DfPJ1QmD|shared-4-CJsHhp5n|shared-0-ByI5P0CP|vendor-all-0-CTKbbUUg|shared-156-Bikz018e)\.js/, target);
    assert.doesNotMatch(text, /cds-badge\.mjs|cds-merge-props\.mjs/, `${target} imports CDS from view-tabs directly`);
    if (expected[target]) assert.deepEqual(exportsOf(text), expected[target], target);
  }
  // Minified locals were shuffled between versions (old QR/$R/iz/oz are now $R/ez/az/sz): pin the original roles.
  const family = readFileSync(path.join(generated, 'sidebar-family-sort.mjs'), 'utf8');
  if (entry('sidebar-family-sort.mjs').referenceVersion === '2.42304.0') assert.match(family, /export \{\s*\$R as sidebarFamilyPivot,\s*ez as sidebarFamilyHead,\s*az as orderSidebarFamilies,\s*sz as splitSidebarFamilies,?\s*\}/);
});

test('the 3.6556.2 navigation badge keeps New, Beta, Preview and upgrade and still drops lab labels', () => {
  const badge = value => renderToStaticMarkup(h(Frame.CdsDensityContext, { value:'compact' }, h(Nav.SidebarNavBadge, { badge:value })));
  assert.equal(badge(undefined), ''); assert.equal(badge('lab'), '');
  assert.match(badge('new'), /data-cds="Badge"[^>]*bg-tint-blue text-accent[^>]*>.*New/);
  assert.match(badge('new'), /whitespace-nowrap/);
  assert.match(badge('beta'), />Beta<\/span>/);
  assert.match(badge('preview'), />Preview<\/span>/);
  assert.match(badge('upgrade'), /<span data-inline-badge="" class="contents"><span class="border-0\.5 border-border-400 text-accent px-1\.5 py-px rounded-3xl font-small ms-auto me-0\.5">Upgrade<\/span><\/span>/);
});
