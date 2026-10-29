import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { ionSource, asarSource } from '../scripts/official-3.6556.2.mjs';

// W10 w10-shell-plugin-settings (menus:N2): a plugin's Settings tab after 3.6556.2 c24c8737b-Czj7X1dz ol / yc / bc,
// shared-130 RE / BE and the main process's readPluginOptions / savePluginOptions (asar index.chunk-CpAqf7sl.js).
// Official chunks are read as text only. SSR through Vite middleware mode; no browser, Electron or core.
const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const raw = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
const rawMain = file => fs.readFileSync(path.join(asarSource, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const PLUGIN_PAGE = raw('c24c8737b-Czj7X1dz.js');

test('3.6556.2 original: the Settings tab, its label and panel copy (c24c8737b ol / yc / bc)', () => {
  assert.equal(count(PLUGIN_PAGE, 't.push({id:"settings",href:se("settings"),label:e})'), 1);
  assert.equal(count(PLUGIN_PAGE, 'rn==="settings"&&en&&a(bc,{pluginId:Qt,options:en,connectorPageStyle:H},Qt)')
    + count(PLUGIN_PAGE, 'rn==="settings"&&en&&i(bc,{pluginId:Qt,options:en,connectorPageStyle:H},Qt)'), 1);
  for (const copy of ['defaultMessage:"Needs setup",id:"cdcfXkQ6da"', 'defaultMessage:"Settings saved. New sessions will use them.",id:"ojrevAjrW3"',
    'defaultMessage:"Parts of this plugin won\\u2019t work until you fill in the required fields.",id:"quEhNLWrh5"',
    'defaultMessage:"These values are saved on this computer and used only by new sessions that run on it, not by SSH, WSL, or cloud sessions.",id:"vDvN8JFlq9"',
    'defaultMessage:"{label} (required)",id:"DmsTgZ8Tai"', 'defaultMessage:"A value is saved and isn\\u2019t shown. Leave this blank to keep it.",id:"0R0Ch7TOHl"',
    'defaultMessage:"Couldn\\u2019t save changes. Try again.",id:"9CrhUOPyTg"', 'defaultMessage:"Too many changes to save at once. Save a few settings at a time.",id:"O3Wno1hbs7"',
    'defaultMessage:"This value wasn\\u2019t accepted. Check it and try again.",id:"wN+H2TY1yy"', 'id:"hdHw9IMtvH"'])
    assert.ok(PLUGIN_PAGE.includes(copy) || PLUGIN_PAGE.includes(copy.replaceAll('\\u2019', '’')), copy);
  // yc: "Settings" plus a warning xs Badge; vc: required without a default among the unconfigured.
  assert.ok(PLUGIN_PAGE.includes('variant:"warning",size:"xs"'));
  assert.ok(PLUGIN_PAGE.includes('return n?.required===!0&&n.default!==!0'));
  assert.ok(PLUGIN_PAGE.includes('"inline-flex items-center gap-xs"'));
  assert.ok(PLUGIN_PAGE.includes('className:"max-w-lg"'));
  assert.ok(PLUGIN_PAGE.includes('type:"submit",variant:"secondary",className:"self-end"'));
  assert.ok(PLUGIN_PAGE.includes('v&&v.length>=2&&v.length<=_c'));
  // shared-130 RE: the query goes through U.getPluginOptions with {mode:"ccd"}.
  const shared130 = raw('shared-130-dWztbTO1.js');
  assert.ok(shared130.includes('var PT={mode:"ccd"}') || /PT=\{mode:"ccd"\}/.test(shared130));
  assert.ok(shared130.includes('U?.getPluginOptions?.(e,PT)'));
  // Main process: on by default (GrowthBook 2795119042), the manifest's userConfig, ccd only.
  const options = rawMain('index.chunk-CpAqf7sl.js');
  assert.ok(options.includes('"2795119042",!0'));
  assert.ok(options.includes('f=u?.userConfig'));
  assert.ok(options.includes('exports.readPluginOptions=C') || /exports\.readPluginOptions\s*=\s*C/.test(options));
  assert.ok(rawMain('index.chunk-jPKPzV-P.js').includes('function Eva(e){return e?.mode==="ccd"}'));
  assert.ok(rawMain('index.chunk-jPKPzV-P.js').includes('function SO(e){return(0,n.join)(e,".claude-plugin","plugin.json")}'));
});

function pluginDir(manifest) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-options-'));
  fs.mkdirSync(path.join(dir, '.claude-plugin'));
  fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify(manifest));
  return dir;
}
const MANIFEST = { name: 'weather', userConfig: {
  apiKey: { type: 'string', title: 'API key', description: 'Your key', required: true, sensitive: true },
  units: { type: 'string', title: 'Units', options: ['metric', 'imperial'], default: 'metric' },
  verbose: { type: 'boolean', title: 'Verbose' },
  city: { type: 'string', title: 'City' },
  retries: { type: 'number', title: 'Retries' },
} };

test('plugin-options.cjs: reads userConfig from the manifest and answers the u2 shape (ccd only)', async () => {
  const { createPluginOptions, declaredOptions, pluginFolderFrom } = require('../electron/plugin-options.cjs');
  const dir = pluginDir(MANIFEST), storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-store-'));
  const store = createPluginOptions({ storePath: () => path.join(storeDir, 'plugin-options.json'), locate: async id => id === 'weather@local' ? dir : null });
  assert.equal(await store.get('weather@local', { mode: 'cloud' }), null, 'Eva: only the ccd context');
  assert.equal(await store.get('other', { mode: 'ccd' }), null, 'no folder → no tab');
  const view = await store.get('weather@local', { mode: 'ccd' });
  assert.deepEqual(Object.keys(view.schema), ['apiKey', 'units', 'verbose', 'city', 'retries']);
  assert.deepEqual(view.schema.apiKey, { type: 'string', title: 'API key', description: 'Your key', required: true, sensitive: true });
  assert.equal(view.schema.units.default, true, 'u2: a declared default reads as true');
  assert.deepEqual(view.choices, { units: ['metric', 'imperial'], verbose: ['true', 'false'] });
  assert.equal(view.inputs.units, 'metric');
  assert.equal(view.inputs.apiKey, '');
  assert.deepEqual(view.configured, []);
  assert.deepEqual(view.unconfigured, ['apiKey', 'units', 'verbose', 'city', 'retries']);
  // g: a manifest name with "@", no name or an empty userConfig gives no tab.
  assert.equal(declaredOptions({ name: 'a@b', userConfig: { x: {} } }), null);
  assert.equal(declaredOptions({ userConfig: { x: {} } }), null);
  assert.equal(declaredOptions({ name: 'a', userConfig: {} }), null);
  assert.equal(pluginFolderFrom({ marketplaces: [{ plugins: [{ id: 'p', installed: true, source: { type: 'local', path: dir } }] }] }, 'p'), dir);
  assert.equal(pluginFolderFrom({ marketplaces: [{ plugins: [{ id: 'p', source: { type: 'remote', path: dir } }] }] }, 'p'), null);
  assert.equal(pluginFolderFrom({ marketplaces: [{ plugins: [{ id: 'p', source: { type: 'local', path: 'relative' } }] }] }, 'p'), null);
});

test('plugin-options.cjs: saving follows F (consent for visible values, secrets hidden, limits, refusals)', async () => {
  const { createPluginOptions } = require('../electron/plugin-options.cjs');
  const dir = pluginDir(MANIFEST), storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-store-'));
  const asked = [];
  let reply = 'confirmed';
  const store = createPluginOptions({ storePath: () => path.join(storeDir, 'plugin-options.json'), locate: async () => dir,
    confirm: async request => { asked.push(request); return reply; }, seal: value => ({ sealed: `x${value}` }), unseal: value => typeof value?.sealed === 'string' ? value.sealed.slice(1) : undefined });
  const ccd = { mode: 'ccd' };
  assert.deepEqual(await store.set('weather@local', { nope: '1' }, ccd), { success: false, refused: { message: 'The plugin declares no such option.' } });
  assert.deepEqual(await store.set('weather@local', { apiKey: '' }, ccd), { success: true, saved: [] }, 'a blank secret keeps its value');
  assert.deepEqual(await store.set('weather@local', { city: 'x'.repeat(1001) }, ccd), { success: false, tooLong: { option: 'city', max: 1000 } });
  assert.deepEqual(await store.set('weather@local', { retries: 'many' }, ccd), { success: false, refused: { option: 'retries', message: '' } });
  // A secret alone after a press is saved without asking (y is skipped: `r && a.open.length === 0 && o === "no"`).
  assert.deepEqual(await store.set('weather@local', { apiKey: 'sk-1' }, ccd), { success: true, saved: ['apiKey'] });
  assert.equal(asked.length, 0);
  // Visible values ask first; Cancel saves nothing.
  reply = 'declined';
  assert.deepEqual(await store.set('weather@local', { city: 'Oslo' }, ccd), { success: false, unconfirmed: 'declined' });
  assert.equal(asked.length, 1);
  assert.deepEqual(asked[0].open, ['⁨City⁩: “⁦Oslo⁩”']);
  reply = 'confirmed';
  assert.deepEqual(await store.set('weather@local', { city: 'Oslo', units: 'imperial', verbose: 'true' }, ccd), { success: true, saved: ['units', 'verbose', 'city'] });
  const view = await store.get('weather@local', ccd);
  assert.deepEqual(view.configured, ['apiKey', 'units', 'verbose', 'city']);
  assert.deepEqual(view.unconfigured, ['retries']);
  assert.equal(view.inputs.city, 'Oslo');
  assert.equal(view.inputs.apiKey, '', 'a saved secret is never sent back');
  const saved = JSON.parse(fs.readFileSync(path.join(storeDir, 'plugin-options.json'), 'utf8'));
  assert.deepEqual(saved.plugins['weather@local'].values.apiKey, { sealed: 'xsk-1' }, 'secrets are sealed on disk');
  assert.equal(fs.statSync(path.join(storeDir, 'plugin-options.json')).mode & 0o777, 0o600);
  // An unchanged visible value is not asked about again.
  asked.length = 0;
  assert.deepEqual(await store.set('weather@local', { city: 'Oslo' }, ccd), { success: true, saved: [] });
  assert.equal(asked.length, 0);
  assert.deepEqual(await store.set('weather@local', { city: 'Oslo' }, { mode: 'cloud' }), { success: false });
});

test('plugin-options.cjs: the consent dialog is the original y (Cancel first and default, 700 ms dwell)', async () => {
  const { consentDialog } = require('../electron/plugin-options.cjs');
  const shown = [];
  let clock = 0;
  const ask = consentDialog({ showMessageBox: async (window, options) => { shown.push(options); clock += 800; return { response: 1 }; }, focusedWindow: () => ({}), appName: () => 'App', now: () => clock });
  assert.equal(await ask({ plugin: 'weather', open: ['City: “Oslo”'], secret: [], pressed: true }), 'confirmed');
  assert.deepEqual(shown[0], { type: 'question', title: 'App', message: 'Save these settings for the plugin “weather”?', detail: 'City: “Oslo”', buttons: ['Cancel', 'Save'], defaultId: 0, cancelId: 0, noLink: true });
  const fast = consentDialog({ showMessageBox: async () => ({ response: 1 }), focusedWindow: () => ({}), appName: () => 'App', now: () => 0 });
  assert.equal(await fast({ plugin: 'w', open: ['a'], secret: [], pressed: true }), 'unavailable', 'answered before it could be read');
  assert.equal(await consentDialog({ showMessageBox: async () => ({ response: 1 }), focusedWindow: () => null, appName: () => 'App' })({ plugin: 'w', open: [], secret: [], pressed: true }), 'unavailable');
  const original = rawMain('index.chunk-CpAqf7sl.js');
  assert.ok(original.includes('Save these settings for the plugin \\u201c{plugin}\\u201d?') || original.includes('Save these settings for the plugin “{plugin}”?'));
  assert.ok(rawMain('index.chunk-CLLpjlxV.js').includes('buttons:[r.cancel,r.allow],defaultId:a,cancelId:a,noLink:!0'));
});

let server, Tab, Customize;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Tab = await server.ssrLoadModule('/src/source-plugin-settings-tab.jsx');
  Customize = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

const OPTIONS = {
  schema: { apiKey: { type: 'string', title: 'API key', required: true, sensitive: true }, units: { type: 'string', title: 'Units', default: true }, verbose: { type: 'boolean', title: 'Verbose', description: 'More logs' }, region: { type: 'string', title: 'Region' } },
  inputs: { apiKey: '', units: 'metric', verbose: 'false', region: 'eu' },
  choices: { units: ['metric', 'imperial'], verbose: ['true', 'false'], region: ['eu', 'us', 'ap', 'sa', 'af', 'me'] },
  configured: [], unconfigured: ['apiKey', 'units', 'verbose', 'region'],
};

test('yc / vc: "Settings" with a warning xs "Needs setup" badge only while a required field is empty', () => {
  assert.equal(Tab.pluginOptionsNeedSetup(OPTIONS), true);
  assert.equal(Tab.pluginOptionsNeedSetup({ ...OPTIONS, unconfigured: ['units'] }), false);
  assert.equal(Tab.pluginOptionsNeedSetup({ ...OPTIONS, schema: { ...OPTIONS.schema, apiKey: { required: true, default: true } } }), false);
  const label = renderToStaticMarkup(React.createElement(Tab.PluginSettingsTabLabel, { options: OPTIONS }));
  assert.match(label, /^<span class="inline-flex items-center gap-xs">Settings<span[^>]*data-cds="Badge"/);
  assert.match(label, /data-variant="warning"|warning/);
  assert.match(label, />Needs setup</);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Tab.PluginSettingsTabLabel, { options: { ...OPTIONS, unconfigured: [] } })), /Needs setup/);
  assert.equal(Tab.pluginOptionsShape({ schema: {}, inputs: {}, choices: {}, configured: [], unconfigured: [] }), null);
  assert.equal(Tab.pluginOptionsShape(null), null);
});

test('bc: intro, warning Banner, one field per schema entry and a secondary Save', () => {
  const html = renderToStaticMarkup(React.createElement(Tab.PluginSettingsPanel, { pluginId: 'weather@local', options: OPTIONS, save: async () => ({ success: true }) }));
  assert.match(html, /^<div class="px-6" data-plugin-settings="weather@local"><form data-cds="Form" novalidate="" class="flex flex-col gap-md max-w-lg">/i);
  assert.match(html, /<p class="text-body text-secondary">These values are saved on this computer and used only by new sessions that run on it, not by SSH, WSL, or cloud sessions\.<\/p>/);
  assert.match(html, /data-cds="Banner"[^]*Parts of this plugin won’t work until you fill in the required fields\./);
  // apiKey: a required password field; units: 2 choices → RadioGroup; verbose: a checkbox row; region: 6 choices → select.
  assert.match(html, /API key \(required\)/);
  assert.match(html, /type="password"[^>]*autoComplete="off"|autocomplete="off"[^>]*type="password"|type="password"/);
  assert.match(html, /data-1p-ignore/);
  // V3-w12-settings-radio: the generated dV (Base UI RadioGroup) and yP (CDS Combobox with Field).
  assert.match(html, /<div role="radiogroup" data-cds="RadioGroup" class="flex flex-col gap-2 font-sans">/);
  assert.match(html, /<span data-checked="" role="radio" tabindex="0" aria-checked="true" aria-labelledby="[^"]+"[^>]*class="cds-reset group\/rd inline-flex items-center gap-2 /);
  assert.match(html, /group\/cb items-start self-start cursor-interactive/);
  assert.match(html, /data-cds="Checkbox"/);
  assert.match(html, /More logs/);
  assert.match(html, /data-cds="Combobox"/);
  assert.equal(count(html, 'data-cds="Field"'), 4);
  // T: the unconfigured choice fields' shown values make Save available from the start.
  assert.match(html, /<button[^>]*type="submit"[^>]*>|type="submit"/);
  assert.match(html, /self-end/);
  assert.doesNotMatch(html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '', /disabled=""/);
  // Nothing to save: Save is disabled.
  const quiet = renderToStaticMarkup(React.createElement(Tab.PluginSettingsPanel, { pluginId: 'p', options: { schema: { city: { title: 'City' } }, inputs: { city: 'Oslo' }, choices: {}, configured: ['city'], unconfigured: [] }, save: async () => ({}) }));
  assert.match(quiet.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '', /disabled=""/);
  assert.doesNotMatch(quiet, /data-cds="Banner"/);
  // A saved secret: not required any more, and the keep hint.
  const kept = renderToStaticMarkup(React.createElement(Tab.PluginSettingsPanel, { pluginId: 'p', options: { ...OPTIONS, configured: ['apiKey'], unconfigured: ['units', 'verbose', 'region'] }, save: async () => ({}) }));
  assert.match(kept, /A value is saved and isn’t shown\. Leave this blank to keep it\./);
  assert.doesNotMatch(kept, /API key \(required\)/);
});

function shallow(component, props, state) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = withMemoCache({
    useId: () => `:r${id++}:`, useRef: value => ({ current: value }), useMemo: create => create(), useCallback: fn => fn,
    useState: value => { const initial = typeof value === 'function' ? value() : value; return [initial && typeof initial === 'object' && 'pluginId' in initial && 'data' in initial ? state : initial, () => {}]; },
    useEffect() {}, useLayoutEffect() {}, useContext: context => context._currentValue, useSyncExternalStore: (subscribe, get) => get(),
  });
  try { return component(props); } finally { internal.H = old; }
}
function findAll(node, predicate, out = []) {
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (!node || typeof node !== 'object') return out;
  if (predicate(node)) out.push(node);
  if (node.props) for (const value of Object.values(node.props)) if (value && typeof value === 'object') findAll(value, predicate, out);
  return out;
}

test('ol: PluginDetail pushes Settings last while RE has data, and shows bc on that tab', () => {
  const plugin = { id: 'weather@local', name: 'Weather', pluginName: 'weather', enabled: true, source: 'local' };
  const detail = { skills: [{ name: 'forecast' }], agents: [{ name: 'a' }] };
  const props = { plugin, detail, error: '', skills: [], view: { tab: 'settings', query: '' }, onView() {}, onBack() {}, onSkill() {}, pluginOptionsApi: { call: async () => null } };
  const tree = shallow(Customize.PluginDetail, props, { pluginId: 'weather@local', data: OPTIONS });
  const tabs = findAll(tree, node => node.props?.role === 'tab');
  assert.deepEqual(tabs.map(node => node.key), ['overview', 'skills', 'agents', 'settings']);
  assert.equal(tabs.at(-1).props.children.type, Tab.PluginSettingsTabLabel);
  assert.equal(tabs.at(-1).props.children.props.options, OPTIONS);
  const panel = findAll(tree, node => node.type === Tab.PluginSettingsPanel);
  assert.equal(panel.length, 1);
  assert.equal(panel[0].props.pluginId, 'weather@local');
  assert.equal(panel[0].props.options, OPTIONS);
  assert.equal(findAll(tree, node => node.props?.className === 'cz-plugin-tab-description').length, 0, 'bc has no tab description line');
  // No data (no userConfig, or no desktop bridge): no Settings tab.
  const without = shallow(Customize.PluginDetail, { ...props, view: { tab: 'overview', query: '' } }, { pluginId: 'weather@local', data: null });
  assert.deepEqual(findAll(without, node => node.props?.role === 'tab').map(node => node.key), ['overview', 'skills', 'agents']);
  const bridgeless = shallow(Customize.PluginDetail, { ...props, pluginOptionsApi: undefined }, { pluginId: 'weather@local', data: OPTIONS });
  assert.ok(!findAll(bridgeless, node => node.props?.role === 'tab').some(node => node.key === 'settings'));
});

test('wiring: main.cjs answers plugin-options through plugin-options.cjs, zh covers the new copy', async () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.equal(count(main, 'require("./plugin-options.cjs")'), 1);
  assert.equal(count(main, 'case "plugin-options":'), 1);
  const { default: zh } = await import('../electron/i18n/zh-CN/index.mjs');
  for (const key of ['Settings', 'Needs setup', 'Couldn’t save changes. Try again.', 'Too many changes to save at once. Save a few settings at a time.',
    'Settings saved. New sessions will use them.', 'This value wasn’t accepted. Check it and try again.', 'Use {max} characters or fewer.', '{label} (required)',
    'A value is saved and isn’t shown. Leave this blank to keep it.', 'These values are saved on this computer and used only by new sessions that run on it, not by SSH, WSL, or cloud sessions.',
    'Parts of this plugin won’t work until you fill in the required fields.', 'Save', 'Cancel', 'and {count} more',
    'Choose {cancelLabel} unless you just pressed Save on a plugin’s Settings tab.', 'Save these settings for the plugin “{plugin}”?', '{title}: value hidden'])
    assert.ok(Object.hasOwn(zh, key), key);
  const source = fs.readFileSync(path.join(app, 'src/source-plugin-settings-tab.jsx'), 'utf8');
  assert.match(source, /from '\.\/generated\/view-tabs\/index\.js'/, 'R6: the view-tabs facade');
});

// ------------------------------------------------------------------------------------------- V3-w11-sweep-shell-b
test('w11 sweep: mP(e) — a primary click or an activation key in the last 1.5 s, read once (EYn / DYn / mP)', () => {
  const official = rawMain('index.chunk-jPKPzV-P.js');
  for (const needle of ['var SYn=1500,CYn=5e3;function wYn(e){return e.key==="Enter"||e.key===" "||e.key==="Space"}',
    'function DYn(e,t=SYn){let n=e===void 0?void 0:pP.get(e);return n===void 0||n.primaryUpAt===0||Date.now()-n.primaryUpAt>t?!1:(n.primaryUpAt=0,!0)}',
    'function mP(e,t=SYn){if(DYn(e,t))return!0;let n=e===void 0?void 0:pP.get(e);return n===void 0||n.activationKeyAt===0||Date.now()-n.activationKeyAt>t?!1:(n.activationKeyAt=0,!0)}',
    'setPluginOptions:async(t,n,r)=>{let i=mP(e);'])
    assert.equal(count(official, needle), 1, needle);
  const { createGestureTracker } = require('../electron/plugin-options.cjs');
  const { EventEmitter } = require('node:events');
  let clock = 10000;
  const gestures = createGestureTracker({ now: () => clock }), contents = new EventEmitter();
  assert.equal(gestures.pressed(contents), false, 'not tracked yet');
  gestures.track(contents); gestures.track(contents);
  assert.equal(contents.listenerCount('input-event'), 1, 'one tracker per webContents');
  contents.emit('input-event', {}, { type: 'mouseDown' }); clock += 100; contents.emit('input-event', {}, { type: 'mouseUp' });
  clock += 1000;
  assert.equal(gestures.pressed(contents), true);
  assert.equal(gestures.pressed(contents), false, 'one press answers one save');
  contents.emit('input-event', {}, { type: 'mouseDown' }); contents.emit('input-event', {}, { type: 'mouseUp' }); clock += 1501;
  assert.equal(gestures.pressed(contents), false, 'older than 1.5 s');
  contents.emit('input-event', {}, { type: 'mouseDown', modifiers: ['rightButtonDown'] }); contents.emit('input-event', {}, { type: 'mouseUp', modifiers: ['rightButtonDown'] });
  assert.equal(gestures.pressed(contents), false, 'not the primary button');
  contents.emit('input-event', {}, { type: 'mouseDown' }); clock += 5001; contents.emit('input-event', {}, { type: 'mouseUp' });
  assert.equal(gestures.pressed(contents), false, 'a press held longer than 5 s is no click');
  contents.emit('before-input-event', {}, { type: 'keyDown', key: 'Enter', isAutoRepeat: true });
  assert.equal(gestures.pressed(contents), false, 'auto-repeat');
  contents.emit('before-input-event', {}, { type: 'keyDown', key: ' ' });
  assert.equal(gestures.pressed(contents), true);
  contents.emit('before-input-event', {}, { type: 'keyDown', key: 'a' });
  assert.equal(gestures.pressed(contents), false, 'not an activation key');
});

test('w11 sweep: main passes mP and the Customize folder, titles the consent "Claude"; the Form keeps h(e.target)', async () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.equal(count(main, 'pluginOptions.gestures.track(e.sender); return p?.op === "set" ? pluginOptions.set(p.pluginId, p.values, p.pluginContext, { pressed: pluginOptions.gestures.pressed(e.sender), cwd: p.cwd }) : pluginOptions.get(p?.pluginId, p?.pluginContext, { cwd: p?.cwd });'), 1);
  assert.equal(count(main, 'locate: async (pluginId, cwd) => pluginFolderFrom(await customizeOperations.run({ operation: "plugins", cwd }), pluginId),'), 1);
  assert.equal(count(main, 'appName: () => tr("Claude")'), 1);
  assert.equal(count(rawMain('index.chunk-CpAqf7sl.js'), 'title:s.formatMessage({defaultMessage:"Claude",id:"ZA4at8nJzT"})'), 1);
  // A secret alone without a press asks first, with the "Choose Cancel unless…" line (`r && a.open.length === 0 && o === "no"`).
  const { createPluginOptions } = require('../electron/plugin-options.cjs');
  const dir = pluginDir(MANIFEST), storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-store-')), asked = [], located = [];
  const store = createPluginOptions({ storePath: () => path.join(storeDir, 'plugin-options.json'), locate: async (id, cwd) => { located.push(cwd); return dir; },
    confirm: async request => { asked.push(request); return 'declined'; }, seal: value => value, unseal: value => value });
  assert.deepEqual(await store.set('weather@local', { apiKey: 'sk-1' }, { mode: 'ccd' }, { pressed: false, cwd: '/work' }), { success: false, unconfirmed: 'declined' });
  assert.equal(asked.length, 1); assert.equal(asked[0].pressed, false);
  await store.get('weather@local', { mode: 'ccd' }, { cwd: '/work' });
  await store.get('weather@local', { mode: 'ccd' });
  assert.deepEqual(located, ['/work', '/work', undefined]);
  // The renderer sends the page's folder; PluginsPage hands its cwd to PluginDetail.
  const tab = fs.readFileSync(path.join(app, 'src/source-plugin-settings-tab.jsx'), 'utf8');
  assert.equal(count(tab, "pluginContext: PLUGIN_OPTIONS_CONTEXT, ...(cwd ? { cwd } : {})"), 2);
  assert.match(tab, /typeof event\.target\?\.nodeType === 'number' && event\.currentTarget\.contains\(event\.target\)/);
  assert.equal(count(raw('cd359c6df-Dv3ZEbLT.js'), 'e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&h(e.target)&&e.currentTarget.contains(e.target)&&!e.nativeEvent.isComposing'), 1);
  assert.match(fs.readFileSync(path.join(ionSource, 'shared-frame-6jtSkIit.js'), 'utf8'), /function qf\(e\)\{return typeof e\?\.nodeType=="number"\}[\s\S]*qf as nu,/);
  const customize = fs.readFileSync(path.join(app, 'src/source-customize.jsx'), 'utf8');
  assert.equal(count(customize, 'usePluginOptions(plugin.id, !!detail, pluginOptionsApi, cwd);'), 1);
  assert.equal(count(customize, 'serverBusy={serverBusy} cwd={cwd||null}/>'), 1);
});

// ------------------------------------------------------------------------------------------- V3-w12-settings-radio
test('w12: bc renders the generated shared-frame dV (N) and yP (w) from the view-tabs facade, no host copy', async () => {
  // c24c8737b imports `Si as w`, `yt as N`, `Mi as x`, `ji as k`, `ki as A`, `Ai as h` from shared-frame; bc calls them so.
  for (const needle of ['Si as w', 'yt as N', 'Mi as x', 'ji as k', 'ki as A', 'Ai as h', 'i(N,{options:v,value:a,onChange:e=>S(t,e)})',
    'i(w,{label:_,hint:l,error:d,items:v,value:a,onChange:e=>S(t,e??"")}'])
    assert.equal(count(PLUGIN_PAGE, needle), 1, needle);
  const frame = raw('shared-frame-6jtSkIit.js');
  for (const needle of ['dV=Object.assign(lV,{Root:uV,Item:oV,Card:cV})', 'dV as yt', 'yP as Si', '"data-cds":"RadioGroup"'])
    assert.ok(frame.includes(needle), needle);
  const source = fs.readFileSync(path.join(app, 'src/source-plugin-settings-tab.jsx'), 'utf8');
  assert.match(source, /import \{[^}]*\bCdsComboboxField\b[^}]*\bCdsRadioGroup\b[^}]*\} from '\.\/generated\/view-tabs\/index\.js'/);
  assert.doesNotMatch(source, /function RadioGroup\b|RADIO_DOT|SourceSelect|role="radio"|cowork-scheduled/, 'the hand-written radio group / host select / second Field import are gone');
  const facade = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  // The panel's radio group and select are exactly the generated components' output inside the same Field.
  const one = (key, entry, choices, input) => renderToStaticMarkup(React.createElement(Tab.PluginSettingsPanel, { pluginId: 'p',
    options: { schema: { [key]: entry }, inputs: { [key]: input }, choices: { [key]: choices }, configured: [key], unconfigured: [] }, save: async () => ({}) }));
  const radio = one('units', { type: 'string', title: 'Units', description: 'Pick one' }, ['metric', 'imperial'], 'imperial');
  const direct = renderToStaticMarkup(React.createElement(facade.CdsField, null, React.createElement(facade.CdsFieldLabel, null, 'Units'),
    React.createElement(facade.CdsRadioGroup, { options: [{ value: 'metric', label: 'metric' }, { value: 'imperial', label: 'imperial' }], value: 'imperial', onChange() {} }),
    React.createElement(facade.CdsFieldDescription, null, 'Pick one')));
  const strip = html => html.replace(/(id|for|aria-labelledby|aria-describedby)="[^"]*"/g, '$1=""');
  assert.ok(strip(radio).includes(strip(direct)), 'Field + CdsRadioGroup markup matches the generated components');
  assert.equal(count(radio, 'role="radio"'), 2);
  assert.match(radio, /<span data-unchecked="" role="radio" tabindex="-1" aria-checked="false"/);
  assert.match(radio, /<span data-checked="" role="radio" tabindex="0" aria-checked="true"/);
  const select = one('region', { type: 'string', title: 'Region', description: 'Where' }, ['eu', 'us', 'ap', 'sa', 'af', 'me'], 'us');
  const directSelect = renderToStaticMarkup(React.createElement(facade.CdsComboboxField, { label: 'Region', hint: 'Where', items: ['eu', 'us', 'ap', 'sa', 'af', 'me'].map(value => ({ value, label: value })), value: 'us', onChange() {} }));
  assert.ok(strip(select).includes(strip(directSelect)), 'CdsComboboxField markup');
  assert.match(select, /<div data-cds="Combobox" class="group\/cbx cds-reset inline-flex items-center gap-1\.5 h-control /);
  assert.match(select, /role="combobox"[^>]*>[^]*?<span class="min-w-0 flex-1 truncate">us<\/span>/);
  assert.doesNotMatch(select, /sselect/, 'not the host SourceSelect');
  assert.equal(count(select, 'data-cds="Field"'), 1);
  // A field error reaches both through the Field (invalid + match error).
  const failing = renderToStaticMarkup(React.createElement(facade.CdsComboboxField, { label: 'Region', error: 'Bad', items: [{ value: 'eu', label: 'eu' }], value: 'eu', onChange() {} }));
  assert.match(failing, /data-invalid=""/);
  assert.match(failing, />Bad</);
});

// ------------------------------------------------------------------------------------------- W12 frame-settings-cont
test('w12: bc text fields are the generated eM (CdsTextInputField) and booleans the generated c09817156 h (CdsCheckboxRow)', async () => {
  // bc: `i(C,{label:_,hint:b,error:d,type:…})` with `Oi as C` (shared-frame `eM as Oi`, eM = Qj around uC) and
  // `i(Sn,{label:o,description:l,…})` with `t as Sn` from c09817156 (`export{h as t}`, h wraps its label in Qj = `Ni as d`).
  assert.equal(count(PLUGIN_PAGE, 'Oi as C'), 1);
  assert.equal(count(PLUGIN_PAGE, 'i(C,{label:_,hint:b,error:d,type:r.sensitive===!0?"password":"text"'), 1);
  assert.equal(count(PLUGIN_PAGE, 't as Sn}from"./c09817156-D4yWRk21.js"'), 1);
  assert.equal(count(PLUGIN_PAGE, 'i(Sn,{label:o,description:l,error:d,checked:a==="true"'), 1);
  const frame = raw('shared-frame-6jtSkIit.js');
  for (const needle of ['eM as Oi', 'Qj as Ni', 'b(uC,{ref:t,required:o,...s})', 'b(Qj,{label:a,hint:i,error:n,fieldClassName:r,children:c})'])
    assert.ok(frame.includes(needle), needle);
  const row = raw('c09817156-D4yWRk21.js');
  for (const needle of ['Ni as d', 'onMouseDown:a,onClick:m,className:D', 't(d,{error:v,fieldClassName:y,children:L})', 'export{h as t}'])
    assert.ok(row.includes(needle), needle);
  const source = fs.readFileSync(path.join(app, 'src/source-plugin-settings-tab.jsx'), 'utf8');
  assert.match(source, /import \{[^}]*\bCdsCheckboxRow\b[^}]*\bCdsTextInputField\b[^}]*\} from '\.\/generated\/view-tabs\/index\.js'/);
  assert.doesNotMatch(source, /FieldFrame|function CheckboxRow|MUTED_TEXT|<CdsCheckbox\b|<CdsTextInput\b/, 'no host copy of Qj / eM / the checkbox row');
  const facade = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  const strip = html => html.replace(/(id|for|aria-labelledby|aria-describedby)="[^"]*"/g, '$1=""');
  const panel = (key, entry, input) => renderToStaticMarkup(React.createElement(Tab.PluginSettingsPanel, { pluginId: 'p',
    options: { schema: { [key]: entry }, inputs: { [key]: input }, choices: {}, configured: [key], unconfigured: [] }, save: async () => ({}) }));
  const text = panel('city', { title: 'City', description: 'Where' }, 'Oslo');
  const directText = renderToStaticMarkup(React.createElement(facade.CdsTextInputField, { label: 'City', hint: 'Where', type: 'text',
    autoComplete: 'off', 'data-1p-ignore': true, required: false, value: 'Oslo', onChange() {} }));
  assert.ok(strip(text).includes(strip(directText)), 'text field = CdsTextInputField');
  const box = panel('verbose', { type: 'boolean', title: 'Verbose', description: 'More logs' }, 'true');
  const directBox = renderToStaticMarkup(React.createElement(facade.CdsCheckboxRow, { label: 'Verbose', description: 'More logs', checked: true, onCheckedChange() {} }));
  assert.ok(strip(box).includes(strip(directBox)), 'boolean = CdsCheckboxRow');
  assert.match(box, /<div data-cds="Field"[^>]*><label class="inline-flex gap-xs text-start font-sans text-body font-normal text-primary group\/cb items-start self-start cursor-interactive">/);
  assert.ok(box.includes(`class="text-footnote leading-snug ${facade.cdsStaysSecondaryTextClass}">More logs</span>`));
});
