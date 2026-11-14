import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { bypassAvailability } from '../electron/permission-policy.mjs';

// Bypass discoverability on every core (the user could not find Bypass on Codex): with the local opt-in off, the Mode
// menu keeps a 'Bypass permissions' row, as Claude Desktop does (approval-shared-current.js Lb nn :8746-8803): an
// 'Enable' row that opens Settings › Code at the opt-in, or a disabled 'Disabled by your organization' row when the
// core's managed requirements refuse it. Selecting Bypass itself still needs the opt-in and the confirmation dialog.
const app = path.resolve(import.meta.dirname, '..');
let server, Permission;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Permission = await server.ssrLoadModule('/src/source-permission-menu.jsx');
});
after(async () => { await server?.close(); });

test('bypassOffer: Enable while the opt-in is off, a managed refusal disables it, nothing once opted in', () => {
  const { bypassOffer } = Permission;
  assert.equal(bypassOffer({ enabled: false, availability: null }), 'enable', 'requirements not read yet: the row still shows');
  // Codex 0.155.1 answers configRequirements/read with {requirements:null} (probed on the real binary, temp CODEX_HOME).
  assert.equal(bypassOffer({ enabled: false, availability: bypassAvailability({ requirements: null }) }), 'enable');
  assert.equal(bypassOffer({ enabled: false, availability: bypassAvailability({ requirements: { allowedSandboxModes: ['workspace-write'] } }) }), 'blocked');
  assert.equal(bypassOffer({ enabled: false, availability: bypassAvailability({ requirements: { allowedApprovalPolicies: ['on-request'] } }) }), 'blocked');
  assert.equal(bypassOffer({ enabled: false, availability: bypassAvailability(undefined) }), 'enable', 'an unreadable answer leads to Settings, which explains it');
  assert.equal(bypassOffer({ enabled: true, availability: bypassAvailability({ requirements: { allowedSandboxModes: ['read-only'] } }) }), null);
});

test('the Mode menu, main and Settings wire the Enable row to the opt-in without selecting Bypass', async () => {
  const menu = await fs.readFile(path.join(app, 'src/source-permission-menu.jsx'), 'utf8');
  // The Enable row is a plain menuitem (no radio check, no digit): it never selects a mode.
  // 3.6556.2 c227f4d5e: no description, the 'Enable in Claude Code settings' (9aM6b8EJG/) tooltip on the row (cfca6870a v).
  assert.match(menu, /bypassOffer === "enable" && onEnableBypass && <SourceTooltip content=\{t\("Enable in Claude Code settings"\)\} side="right" multiline>\s*<SourceMenu\.Item className="sp-permission-item sp-permission-enable" label=\{BYPASS_LABEL\} data-permission-action="enable-bypass"/);
  assert.doesNotMatch(menu, /Turn on in Settings to use it/);
  assert.doesNotMatch(menu.slice(menu.indexOf('sp-permission-enable"')), /^[^\n]*checkedRole="radio"/);
  assert.match(menu, /trailing=\{<span className="sp-permission-enable-text">\{t\("Enable"\)\}<\/span>\}/);
  assert.match(menu, /disabledReason=\{t\("Disabled by your organization"\)\} data-permission-action="bypass-blocked"/);
  const main = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  // With the opt-in on, the connected core's own refusal (bypassRefusal) still turns the row into the managed one.
  assert.match(main, /bypassOffer=\{bypassOffer\(\{ enabled: bypassOptIn && !bypassRefusal, availability: bypassOptIn \? bypassRefusal : bypassRequirements \}\)\}/);
  assert.match(main, /const bypassOptIn = boot\?\.config\?\.allowBypassPermissions === true;/);
  // A remembered or carried Bypass reads as Auto on a core whose requirements refuse it.
  assert.match(main, /useBypassPermission\(\{permission, enabled: bypassOptIn && !bypassRefusal, mode,/);
  assert.match(main, /if \(!bypassOptIn \|\| !boot\?\.connected\) \{ setBypassRefusal\(null\); return; \}/);
  assert.match(main, /onEnableBypass=\{\(\) => \{ closeMenu\(\); setSettings\("code#bypass"\); \}\}/);
  // The Mode menu reads the requirements itself only while the opt-in is off, when it opens (bypassRefusal covers opt-in on).
  assert.match(main, /if \(permissionMenuToken === null \|\| boot\?\.config\?\.allowBypassPermissions === true \|\| !boot\?\.connected\) return;/);
  const settings = await fs.readFile(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.match(settings, /const \[section,anchorRow\]=String\(initialSection\?\?''\)\.split\('#'\);/);
  assert.match(settings, /if\(anchorRow\)setHighlight\(\{id:anchorRow\}\);/);
  assert.match(settings, /row\('bypass',t\('Allow bypass permissions mode'\)/);
  // The opt-in is never the default permission: the Settings default list has no Bypass.
  // Default permission mode: the four modes, plus Bypass only while its opt-in is on.
  assert.match(settings, /items=\{\[\{value:'auto',label:t\('Auto'\)\},\{value:'ask',label:t\('Manual'\)\},\{value:'acceptEdits',label:t\('Accept edits'\)\},\{value:'plan',label:t\('Plan'\)\},/);
  assert.match(settings, /\.\.\.\(config\.allowBypassPermissions===true\?\[\{value:'bypass',label:t\('Bypass permissions'\)\}\]:\[\]\)/);
  const mainProcess = await fs.readFile(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(mainProcess, /\n  "configRequirements\/read",\n/);
});
