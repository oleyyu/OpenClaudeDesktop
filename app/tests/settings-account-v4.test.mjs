// settings-account-v4 (4.16336.0, scripts/extract-settings-account-v4.mjs): the official Settings › Privacy route
// (cf4f70727 pn → cc5f29bb3 F) sliced over the cds-core shared graph, its pins and cut contracts, the host seam
// (src/settings-routes-account.mjs) and the host wiring (src/source-settings-privacy.jsx). React SSR over fixture data only
// (the host's local profile; no real account, no user profile).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = path.join(app, 'src/generated/settings-account-v4');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
let gen, official, adapter, seam, core, gb;
before(async () => {
  gen = await import('../scripts/extract-settings-account-v4.mjs');
  official = await import('../scripts/official-4.16336.0.mjs');
  adapter = await import('../src/settings-account-adapter.mjs');
  seam = await import('../src/settings-routes-account.mjs');
  core = await import('../src/generated/cds-core/shared-frame.mjs');
  gb = await import('../src/host-growthbook.mjs');
});
const chunk = name => fs.readFileSync(path.join(official.ionSource, name), 'utf8');
const render = node => renderToStaticMarkup(h(core.CdsRoot, {}, node));

test('graph: one root (cf4f70727 pn, unexported), cds-core shared graph, settings-nav store linked; Usage blocked, Account closed', () => {
  assert.deepEqual(gen.roots.map(r => [r.semantic, r.file, r.local, r.export]), [['SettingsPrivacyPage', 'cf4f70727-BlN3pGWP.js', 'pn', null]]);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const provenance = JSON.parse(fs.readFileSync(path.join(out, 'provenance.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph.area ?? manifest.sharedGraph, 'cds-core');
  assert.equal(provenance.migrationComplete, false);
  assert.deepEqual(provenance.linkedAreas.map(l => [l.area, l.modules]), [['settings-nav', ['settings-store.mjs']]]);
  const targets = manifest.modules.map(m => m.target);
  for (const t of ['routes.mjs', 'privacy-page.mjs', 'shared-55.mjs', 'shared-25.mjs']) assert.ok(targets.includes(t), t);
  // The privacy-page module is cc5f29bb3 and routes is cf4f70727 (the official files).
  assert.equal(manifest.modules.find(m => m.target === 'privacy-page.mjs').source, 'cc5f29bb3-CYhM9-2J.js');
  assert.equal(manifest.modules.find(m => m.target === 'routes.mjs').source, 'cf4f70727-BlN3pGWP.js');
  // Usage (c71860c77-DaFphJRS ae) is not sliced: the chart's motion frame clock is vendor-motion state held by
  // working-line-v4 and not published by cds-core (D1). Account (c71860c77-CDFXHgkP q) is the official closed branch.
  assert.equal(provenance.usageBlocked.root, 'c71860c77-DaFphJRS.js#ae');
  assert.deepEqual(provenance.usageBlocked.blockedBy.map(b => b.replace(/^vendor-motion-[^#]+#/, '')).sort(), ['F', 'Ie', 'Le']);
  assert.deepEqual(provenance.accountClosed, { route: 'account', root: 'c71860c77-CDFXHgkP.js#q', gate: 'shared-55 Kg: no account entry on desktop' });
  assert.ok(!targets.some(t => /c71860c77/.test(t)), 'no Usage / Account module generated');
});

test('pins: sources, root declaration, cuts, adapter bytes and the cds-core / settings-nav manifests are the reviewed ones', () => {
  const pins = JSON.parse(read('scripts/settings-account-v4-pins.json'));
  assert.equal(pins.referenceVersion, official.referenceVersion);
  for (const [file, hash] of Object.entries(pins.sources)) assert.equal(sha(fs.readFileSync(path.join(official.ionSource, file))), hash, file);
  assert.ok(Object.keys(pins.sources).includes('cf4f70727-BlN3pGWP.js') && Object.keys(pins.sources).includes('cc5f29bb3-CYhM9-2J.js'));
  const routes = chunk('cf4f70727-BlN3pGWP.js'), start = pins.roots.SettingsPrivacyPage.start, end = pins.roots.SettingsPrivacyPage.end;
  assert.equal(sha(routes.slice(start, end)), pins.roots.SettingsPrivacyPage.declarationSha256);
  assert.equal(pins.hostAdapterSha256, sha(fs.readFileSync(path.join(app, 'src/settings-account-adapter.mjs'))));
  assert.equal(pins.cdsCore.manifestSha256, sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))));
  assert.equal(pins.settingsNav.manifestSha256, sha(fs.readFileSync(path.join(app, 'src/generated/settings-nav/manifest.json'))));
  assert.deepEqual(Object.keys(pins.cuts).sort(), ['FormattedMessage', 'useAdminSettingsAvailable', 'useExportDataPermissions', 'useGrowthBookClient',
    'useIntl', 'usePrivacySection', 'usePrivacyUploadedFilesPage', 'useServedDeploymentConfig', 'useServerGatesReady', 'growthBookEval'].sort());
});

test('official source: pn routes to F when the privacy section shows; F renders only SettingsStack > div.pb-xl > ge', () => {
  const routes = chunk('cf4f70727-BlN3pGWP.js'), privacy = chunk('cc5f29bb3-CYhM9-2J.js');
  assert.ok(routes.includes('"/admin-settings/data-privacy-controls"') && routes.includes('"/settings"'));
  assert.ok(privacy.includes('className:"pb-xl"'));
  assert.ok(privacy.includes('flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring'));
  assert.ok(privacy.includes('defaultMessage:"your provider"'));
  // The generated bytes are the official declarations (generator header; never hand-edited).
  assert.match(fs.readFileSync(path.join(out, 'privacy-page.mjs'), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from cc5f29bb3-CYhM9-2J\.js; generated by scripts\/extract-settings-account-v4\.mjs\./);
  assert.match(fs.readFileSync(path.join(out, 'routes.mjs'), 'utf8'), /import \{\n  useAdminSettingsAvailable as \$e,\n  useServerGatesReady as I,\n  usePrivacySection as ue,\n\} from "\.\.\/\.\.\/settings-account-adapter\.mjs";/);
});

test('cut answers are the official local-profile branches (no organization, host GrowthBook table)', () => {
  assert.deepEqual(adapter.usePrivacySection(), { show: true, isPending: false });
  assert.deepEqual(adapter.usePrivacyUploadedFilesPage(), { show: gb.hostGrowthBookFlag('privacy_uploaded_files_page_main') === true, isPending: false });
  assert.equal(gb.hostGrowthBookFlag('export_data'), false);
  assert.deepEqual(adapter.useExportDataPermissions(), { canExportData: false, ownDataOnly: false, isPending: false });
  assert.equal(adapter.useAdminSettingsAvailable(), false);
  assert.equal(adapter.useServerGatesReady(), true);
  assert.equal(adapter.useServedDeploymentConfig(), undefined);
  assert.equal(adapter.useGrowthBookClient(), null);
  assert.deepEqual(adapter.growthBookEval(null, 'not_a_listed_flag_for_settings_account'), { value: null, on: false, off: true, source: 'unknownFeature' });
  // The Privacy section answer is the one settings-nav uses (settings-shell-model capabilities.usePrivacySection).
  return import('../src/settings-shell-model.mjs').then(shell => {
    assert.deepEqual(shell.settingsNavHostValue().capabilities.usePrivacySection, adapter.usePrivacySection());
    assert.deepEqual(seam.HOST_CURRENT_ACCOUNT.activeOrganization, shell.LOCAL_PROFILE_ACCOUNT.activeOrganization);
    assert.equal(seam.HOST_CURRENT_ACCOUNT.account.uuid, shell.LOCAL_PROFILE_ACCOUNT.account.uuid);
    assert.deepEqual(seam.HOST_CURRENT_ACCOUNT.account.invites, []);
  });
});

test('SSR: the official Privacy route renders the "where your conversations go" card (ownProvider, your provider)', () => {
  const html = render(h(seam.SettingsPrivacyRoute));
  assert.match(html, /^<div class="cds-root[^"]*"[^>]*><div class="flex flex-col "><div class="pb-xl"><div class="flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring"><p class="pb-md text-footnote">You’re running Claude through your organization’s own inference provider \(your provider\)\. Your conversations are sent there, not to Anthropic, and are governed by your organization’s agreement with that provider\.<\/p>/);
  assert.match(html, /<div class="border-t border-alpha-1 pt-sm"><div class="flex flex-col gap-md pt-xs">/);
  assert.match(html, /<p class="text-body text-secondary">What Anthropic doesn’t see<\/p><ul class="list-disc ps-6 pt-1 space-y-1">/);
  assert.match(html, /What Anthropic may receive \(configured by your organization\)/);
  // Not the claude.ai / organization-server branches.
  assert.doesNotMatch(html, /via the Claude API/);
  assert.doesNotMatch(html, /your organization’s servers/);
  // No redirect, no claude.ai export row (F never renders uL on desktop).
  assert.doesNotMatch(html, /Export data/);
});

test('host wiring: Settings › Account draws the compact privacy host (Data › Export data, no official route); the full page keeps the route above the row', () => {
  const privacy = read('src/source-settings-privacy.jsx');
  assert.match(privacy, /^import \{ SettingsPrivacyRoute \} from '\.\/settings-routes-account\.mjs';/m);
  // U-SET-LITE-2: compact titles the group 'Data' and leaves the official route out; the full page (compact false, the
  // default) is still Privacy › official route › Export data row.
  assert.match(privacy, /export function SourceSettingsPrivacy\(\{ desktopCall, boot, initialOpen = false, compact = false \}\)/);
  assert.match(privacy, /<h3 tabIndex=\{-1\} className="text-heading-semibold settings-row-title">\{compact \? t\('Data'\) : t\(PRIVACY_COPY\.title\)\}<\/h3>\n    \{!compact && <SettingsPrivacyRoute\/>\}\n    <div className="settings-group-dividers"><SettingRow row=\{row\}\/><\/div>/);
  const settings = read('src/source-settings.jsx');
  // The privacy host page is the compact one, and the nav has no Privacy entry: its host sits on Account.
  assert.match(settings, /^const SourceSettingsPrivacyCompact = props => <SourceSettingsPrivacy \{\.\.\.props\} compact\/>;$/m);
  assert.match(settings, /\{id:'privacy',label:'Privacy',icon:'LockShield',group:'Settings',[^\n]*page:SourceSettingsPrivacyCompact\}/);
  assert.match(settings, /\{id:'account',label:'Account',icon:'User',hosts:\['account','privacy'\]\}/);
  assert.doesNotMatch(settings, /\{id:'privacy',label:'Privacy',icon:'[^']+',hosts:/);
  // Usage stays the host page (official Usage blocked), on its own nav entry.
  assert.match(settings, /\{id:'usage',label:'Usage',icon:'UsageGaugeMiddle',hosts:\['usage'\]\}/);
  assert.match(settings, /\{id==='usage'&&<SourceUsage /);
});
