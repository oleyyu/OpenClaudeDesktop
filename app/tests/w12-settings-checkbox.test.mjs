import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// W12 frame-settings-cont: the host SourceSettingsCheckbox (a 2.2553.1 CDS Checkbox copy: native input + appearance:none)
// is gone. Its call sites are the 3.6556.2 CDS Checkbox with its own label (shared-frame xP, published as view-tabs
// CdsCheckbox), the way c71860c77's Clean up inactive sessions dialog draws its choices: `r(F,{checked,disabled,
// onCheckedChange,label})`, F = shared-frame `xi` = xP.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(v1, file), 'utf8');
const src = file => fs.readFileSync(path.join(app, file), 'utf8');
let server, V;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

test('3.6556.2 original: the cleanup choices are xP with a label prop; xP draws the label inside its own root', () => {
  const cleanup = raw('c71860c77-BH7EuJ1o.js');
  for (const needle of ['xi as F', 'r(F,{checked:t.includeUncommitted,disabled:u,onCheckedChange:e=>i({...t,includeUncommitted:e===!0}),label:',
    'r(F,{checked:t.deleteSessions,disabled:u,onCheckedChange:e=>i({...t,deleteSessions:e===!0}),label:',
    'T!==null&&r(F,{checked:u,disabled:H,onCheckedChange:e=>d(e===!0),label:T})', 'o("div",{className:"flex flex-col gap-xs",children:[e.uncommittedCount>0&&'])
    assert.ok(cleanup.includes(needle), needle);
  const frame = raw('shared-frame-6jtSkIit.js');
  for (const needle of ['xP as xi', '({label:s,description:a,size:d,className:i,disabledReason:o,animated:f,"aria-describedby":n,"aria-labelledby":r,onMouseDown:l,...u}=e',
    'g=s!=null&&typeof s!="boolean"&&s!==""', 'Q("cds-reset group/cb border-0 outline-none focus-visible:outline-hidden data-[disabled]:opacity-disabled",DS,E,D,i)',
    'G(ne,{ref:t,"data-cds":"Checkbox","aria-labelledby":S,"aria-describedby":C,...u,...w,onMouseDown:T,className:O,children:[I,L]})'])
    assert.ok(frame.includes(needle), needle);
  assert.match(fs.readFileSync(path.join(app, 'src/generated/view-tabs/shared-frame-6jtSkIit.js'), 'utf8'), /\bxP as CdsCheckbox\b/);
});

test('every former SourceSettingsCheckbox call site is the facade CdsCheckbox with a label; the host copy is deleted', () => {
  for (const file of ['src/source-settings-checkbox.jsx', 'src/source-settings-checkbox.css']) assert.equal(fs.existsSync(path.join(app, file)), false, file);
  const pages = src('src/source-settings-pages.jsx'), models = src('src/source-settings-models.jsx'), profiles = src('src/source-settings-tool-profiles.jsx');
  for (const [name, text] of [['pages', pages], ['models', models], ['profiles', profiles]]) {
    assert.doesNotMatch(text, /SourceSettingsCheckbox|source-settings-checkbox|sscb/, name);
    assert.match(text, /import \{[^}]*\bCdsCheckbox\b[^}]*\} from '\.\/generated\/view-tabs\/index\.js'/, name);
  }
  assert.ok(pages.includes('<CdsCheckbox checked={current.includeUncommitted} disabled={pending} onCheckedChange={checked => choose({ includeUncommitted: checked === true })} label={cleanupUncommittedLabel('));
  assert.ok(pages.includes('<CdsCheckbox checked={current.deleteSessions} disabled={pending} onCheckedChange={checked => choose({ deleteSessions: checked === true })} label={cleanupDeleteLabel(preview, current)}/>'));
  assert.ok(pages.includes('<CdsCheckbox checked={acknowledged} disabled={pending} onCheckedChange={checked => setAcknowledged(checked === true)} label={acknowledgement}/>'));
  assert.doesNotMatch(src('src/source-settings-pages.css'), /ss-cleanup-check/);
  assert.ok(models.includes(`<CdsCheckbox className="msx-check" checked={clearKey} disabled={!!form.apiKey} onCheckedChange={checked => setClearKey(checked === true)} label={t('Remove the saved key')}/>`));
  assert.equal((profiles.match(/<CdsCheckbox key=/g) || []).length, 2);
  assert.doesNotMatch(profiles, /<label key=/);
  assert.doesNotMatch(src('src/models-settings.css'), /input:disabled/);
});

test('SSR: the labelled CdsCheckbox the call sites now render (root carries className / title / data-*; disabled dims the row)', () => {
  const render = props => renderToStaticMarkup(React.createElement(V.CdsCheckbox, { onCheckedChange() {}, ...props }));
  const plain = render({ checked: true, disabled: false, label: 'Also delete the inactive session and its conversation' });
  assert.match(plain, /^<span[^>]*data-cds="Checkbox"/);
  assert.match(plain, /class="cds-reset group\/cb border-0 outline-none focus-visible:outline-hidden data-\[disabled\]:opacity-disabled inline-flex gap-xs text-start font-sans text-body font-normal text-primary items-start"/);
  assert.match(plain, /mt-\[calc\(\(1lh_-_var\(--cds-checkbox,1rem\)\)_\/_2\)\]/);
  assert.match(plain, /<span>Also delete the inactive session and its conversation<\/span><\/span>/);
  assert.match(plain, /role="checkbox"/);
  assert.match(plain, /aria-checked="true"/);
  assert.doesNotMatch(plain, /sscb|appearance/);
  const locked = render({ className: 'tprof-check', title: 'Turned off with shell', 'data-tool-locked': '', checked: false, disabled: true,
    label: React.createElement('span', { className: 'tprof-name' }, 'write') });
  assert.match(locked, /^<span[^>]*title="Turned off with shell"/);
  assert.match(locked, /data-tool-locked=""/);
  assert.match(locked, /data-disabled=""/);
  assert.match(locked, / items-start tprof-check"/);
  assert.match(locked, /<span><span class="tprof-name">write<\/span><\/span><\/span>/);
});
