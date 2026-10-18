import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// R2 composer-send-cell: the Code card's Send/Stop is the original 2.42304.0 c227f4d5e lM (generated
// composer-send-cell.mjs). Its crossfade Ij (2.2553.1 sm, unchanged): the first mount renders only the active layer
// (Nj), with no Pj fade-in (c starts false) and no inert/aria-hidden Fj layer.
let server, C, Cell;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Cell = await server.ssrLoadModule('/src/generated/code-composer/composer-send-cell.mjs');
});
after(() => server?.close());
const stopEl = React.createElement('button', { type: 'button', 'aria-label': 'Stop response' });
const sendEl = React.createElement('button', { type: 'submit', 'aria-label': 'Send message' });
const NJ = 'col-start-1 row-start-1 flex cursor-default items-center justify-end';
for (const showStop of [false, true]) test(`first mount (showStop=${showStop}) renders one plain Nj layer in the grid cell`, () => {
  const html = renderToStaticMarkup(React.createElement(Cell.SubmitCrossfade, { showStop, stop: stopEl, send: sendEl }));
  assert.ok(html.startsWith('<div class="grid items-center justify-items-end">'), html);
  assert.deepEqual(html.match(/<div class="[^"]*"[^>]*>/g).slice(1), [`<div class="${NJ}">`], 'Nj only: no Pj, Fj, inert or aria-hidden');
  assert.doesNotMatch(html, /inert|aria-hidden|cds-fade-in|opacity-0/);
  assert.equal(html.includes('Stop response'), showStop);
  assert.equal(html.includes('Send message'), !showStop);
});

// Fidelity F05: cc43287c9-BMbiZYzF.js:27612 Jr / :28636-28638 — `disabled` (archived, real locks) is separate from
// `submitDisabled`: a loading session or a lost connection keeps the editor typeable while Send stays disabled.
const noop = () => {};
const composer = props => renderToStaticMarkup(React.createElement(C.SourceComposer, {
  draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'auto', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture', ...props }));
// R3-composer step 3 (composer-shell): the Code card is the CDS ChatComposer shell. Its ChatComposerEditor box holds the
// local ProseMirror element (role textbox), and uM's root div carries the host's data-busy / data-disabled hooks.
const editorTag = html => /<div data-cds="ChatComposerEditor"[^>]*>(<div[^>]*role="textbox"[^>]*>)/.exec(html)?.[1] ?? '';
// R4g-composer CP2 (X7-08): the copy is shared-9 cm's placeholder span (before the editor box), with a grow ghost in the box.
const placeholderOf = html => /<span data-composer-placeholder="" aria-hidden="true" elementtiming="composer-placeholder-text" class="[^"]*"[^>]*>([^<]*)<\/span>/.exec(html)?.[1];
const ghostOf = html => /<span class="invisible [^"]*" aria-hidden="true" data-composer-placeholder-ghost="([^"]*)"><\/span>/.exec(html)?.[1];
const sendTag = html => /<button[^>]*aria-label="Send"[^>]*>/.exec(html)?.[0] ?? '';
const cardTag = html => /<div class="sc-composer epitaxy-prompt[^"]*"[^>]*>/.exec(html)?.[0] ?? '';
test('loading or disconnected: the editor stays contenteditable with no aria-disabled; Send is disabled; the card is not data-disabled', () => {
  for (const props of [{ canSubmit: false }, { canSubmit: false, warning: 'Connection to DeepSeek lost.', onReconnect: noop }]) {
    const html = composer(props);
    assert.match(editorTag(html), /contentEditable="true"/); assert.doesNotMatch(editorTag(html), /aria-disabled/);
    assert.match(sendTag(html), / disabled=""/, 'Send waits for the session and the core');
    assert.doesNotMatch(cardTag(html), /data-disabled/);
  }
  assert.match(composer({ canSubmit: false, warning: 'Connection to DeepSeek lost.', onReconnect: noop }), /data-cds-composer-warning="">.*Retry/, 'the warning row and Retry stay');
  assert.doesNotMatch(sendTag(composer({})), / disabled=""/, 'a connected, loaded session can send');
});
test('an archived (not editable) composer disables the editor and marks the card', () => {
  const html = composer({ editable: false });
  assert.match(editorTag(html), /contentEditable="false"/); assert.match(editorTag(html), /aria-disabled="true"/);
  assert.match(cardTag(html), /data-disabled="true"/); assert.match(sendTag(html), / disabled=""/);
});
test('a host command can still be sent without a connection; a skill message cannot', () => {
  assert.doesNotMatch(sendTag(composer({ draft: '/theme dark', canSubmit: false })), / disabled=""/);
  const skills = [{ name: 'pdf', path: '/s/pdf/SKILL.md' }];
  assert.match(sendTag(composer({ draft: '/pdf go', canSubmit: false, commandContext: { skills } })), / disabled=""/, 'a skill is a message');
  assert.doesNotMatch(sendTag(composer({ draft: '/pdf go', commandContext: { skills } })), / disabled=""/);
});

// R05 'Send and stay here' (c099c328d :8870-8895 Send tooltip rows Tm{Send, enter} + de ? Tm{'Send and stay here',
// cmd+enter}; cc43287c9 :28620 stayOnDraftHint on the Home draft). The tooltip popup only mounts on hover, so a
// second SSR server wraps the tooltip lM renders in a probe that records the props each tooltip receives. Since R3 (D24,
// composer-row-chin) that is the view-tabs CDS Tooltip itself (shared-frame Zp, exported as CdsTooltip), so the probe
// wraps that export of the generated module in the test's own transform (the file on disk is untouched).
let probeServer, P;
before(async () => {
  const probe = { name: 'tooltip-probe', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('/src/generated/view-tabs/shared-frame-BfjMqbuN.js')) return null;
    if (code.split('Zp as CdsTooltip').length !== 2) throw Error('shared-frame no longer exports Zp as CdsTooltip');
    return code.replace('Zp as CdsTooltip', '__probeTooltip as CdsTooltip')
      + '\nimport { createElement as __probeH, Fragment as __probeF } from "react";\nimport { renderToStaticMarkup as __probeMarkup } from "react-dom/server";\nfunction __probeTooltip(props) { return __probeH(__probeF, null, __probeH(Zp, props), __probeH("span", { hidden: true, "data-tooltip-probe": JSON.stringify({ content: typeof props.content === "string" ? props.content : null, markup: typeof props.content === "string" ? null : __probeMarkup(props.content), shortcut: props.shortcut ?? null, multiline: props.multiline ?? null, open: props.open ?? null }) })); }\n';
  } };
  probeServer = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [probe, react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  P = await probeServer.ssrLoadModule('/src/source-composer.jsx');
});
after(() => probeServer?.close());
const probes = props => [...renderToStaticMarkup(React.createElement(P.SourceComposer, {
  draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'auto', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture', ...props }))
  .matchAll(/data-tooltip-probe="([^"]*)"/g)].map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#x27;', "'").replaceAll('&amp;', '&')));
// lM's Send tooltip: a single row (lo{content: Send, shortcut: enter}) unless z = showStop || stayOnDraftHint ||
// enableForkSubmit, then multiline rows sM: Send ⏎, then Queue for later ⌘⏎ while a turn runs (s && !C) or Send and
// stay here ⌘⏎ on the Home draft (x && u), then Send in a forked session ⌘⌥⏎ (y).
// The CDS Shortcut (ks) draws each cap as a kbd; a spoken name rides in an sr-only span beside the aria-hidden glyph.
const rows = entry => [...(entry?.markup ?? '').matchAll(/<span class="inline-flex items-center justify-between gap-xs">([^<]*)<span data-cds="Shortcut"[^>]*>(.*?)<\/span><\/span>/g)]
  .map(match => [match[1], match[2].replace(/<span class="sr-only select-none">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '')]);
const sendTooltip = props => probes(props).find(entry => entry.content === 'Send' || /^<span class="inline-flex flex-col gap-1"><span class="inline-flex items-center justify-between gap-xs">Send</.test(entry.markup ?? ''));
test("the Home draft's Send tooltip has the rows Send ⏎ and 'Send and stay here' ⌘⏎; an open session's is the single Send ⏎", () => {
  const home = sendTooltip({ stayOnDraft: true });
  assert.equal(home.multiline, true);
  assert.deepEqual(rows(home).map(row => row[0]), ['Send', 'Send and stay here']);
  assert.deepEqual(rows(home).map(row => row[1]), ['⏎', 'Ctrl⏎'], 'SSR keycaps (non-mac server snapshot)');
  const session = sendTooltip({});
  assert.deepEqual([session.content, session.shortcut, session.multiline], ['Send', 'enter', null]);
  // While a turn runs with content the second row is the queue lane, never the stay lane.
  assert.deepEqual(rows(sendTooltip({ stayOnDraft: true, running: true, queueEnabled: true })).map(row => row[0]), ['Send', 'Queue for later']);
  assert.equal(probes({ stayOnDraft: true }).some(entry => /fork/i.test(JSON.stringify(entry))), false, 'no ⌘⌥⏎ fork row without forkAvailable');
});
test("the Send tooltip adds the ⌘⌥⏎ fork row when forkAvailable and no turn runs", () => {
  assert.deepEqual(rows(sendTooltip({ forkAvailable: true })), [['Send', '⏎'], ['Send in a forked session', 'CtrlAlt⏎']]);
  assert.deepEqual(rows(sendTooltip({ forkAvailable: true, running: true, queueEnabled: true })).map(row => row[0]), ['Send', 'Queue for later'], 'a running turn cannot fork');
  assert.deepEqual(rows(sendTooltip({ forkAvailable: true, stayOnDraft: true })).map(row => row[0]), ['Send', 'Send and stay here', 'Send in a forked session']);
});
test("Send and Stop are the original lM buttons: names, test ids, the md glyphs in 'flex scale-90', Stop's escape shortcut", async () => {
  const icons = (await import('../src/generated/icons.json', { with: { type: 'json' } })).default;
  const idle = composer({});
  assert.match(sendTag(idle), /data-testid="code-prompt-send"/);
  assert.match(sendTag(idle), /data-cds="Button"/);
  assert.match(sendTag(idle), /aria-keyshortcuts="Enter"/);
  assert.doesNotMatch(idle, /aria-label="Send message"/);
  assert.match(idle, /<span class="flex scale-90"><span data-cds="Icon"[^>]*>/, 'cy wraps the md glyph');
  const busy = composer({ running: true, onStop: noop, draft: '' });
  const stopButton = /<button[^>]*aria-label="Stop"[^>]*>.*?<\/button>/.exec(busy)?.[0] ?? '';
  assert.match(stopButton, /data-testid="code-prompt-stop"/);
  assert.match(stopButton, /aria-keyshortcuts="Escape"/);
  assert.ok(stopButton.includes(String.fromCodePoint(icons.StopCircle)), 'StopCircle, not the plain Stop square');
  assert.doesNotMatch(busy, /aria-label="Stop response"/);
  const stopTip = probes({ running: true, draft: '' }).find(entry => entry.content === 'Stop');
  assert.deepEqual([stopTip.shortcut, stopTip.open], ['escape', null], 'B = escapeClaimed ? void 0 : "escape"; U = L ? void 0 : !1');
  assert.equal(probes({ running: true, draft: '', escapeClaimed: true }).find(entry => entry.content === 'Stop').shortcut, null);
});
test('presets card: trailing-controls > send-cell with the inert size-control placeholder; Send only with a draft; Stop while running', () => {
  const empty = composer({ draft: '' });
  assert.match(empty, /<div data-testid="code-prompt-trailing-controls" class="flex items-center gap-2"><div data-testid="code-prompt-send-cell" class="grid shrink-0 items-center justify-items-end"><div aria-hidden="true" inert="" class="col-start-1 row-start-1 flex invisible"><span class="size-control"><\/span><\/div>/);
  assert.doesNotMatch(empty, /code-prompt-send"/, 'w && !j ? null: no Send without a draft');
  assert.doesNotMatch(empty, /code-prompt-stop/);
  assert.match(composer({ draft: 'hello' }), /data-testid="code-prompt-send"/);
  assert.match(composer({ draft: '', sending: true }), /data-testid="code-prompt-send"[^>]*>|aria-busy="true"[^>]*data-testid="code-prompt-send"/, 'submitQueued: the busy Send shows');
  assert.match(composer({ draft: '', sending: true }), /<button[^>]*aria-busy="true"[^>]*aria-label="Send"/);
  const running = composer({ running: true, draft: '' });
  assert.match(running, /data-testid="code-prompt-stop"/);
  assert.doesNotMatch(running, /code-prompt-send"/);
  // With a draft and the queue lane the Send yields... L = s && (!k || !(g || _)): Send replaces Stop.
  const queued = composer({ running: true, draft: 'more', queueEnabled: true });
  assert.match(queued, /data-testid="code-prompt-send"/); assert.doesNotMatch(queued, /data-testid="code-prompt-stop"/);
  // Interrupting (stopping): no Stop; an empty presets draft then shows nothing in the cell.
  assert.doesNotMatch(composer({ running: true, stopping: true, draft: '' }), /code-prompt-(send|stop)"/);
  // The side session (codeLayout side-session): the plain lM row, a disabled Send even when empty.
  const side = composer({ codeLayout: 'side-session', draft: '' });
  assert.doesNotMatch(side, /code-prompt-trailing-controls/);
  assert.match(side, /<div class="flex items-center gap-xs">/);
  assert.match(sendTag(side), / disabled=""/);
});
test('a press on Send while the core is still connecting is the aria-disabled blocked press (OP onSubmitBlocked), not a dead button', () => {
  const hint = 'Still connecting to DeepSeek. Try again in a moment.';
  const tag = sendTag(composer({ canSubmit: false, connectingHint: hint }));
  assert.match(tag, /aria-disabled="true"/); assert.doesNotMatch(tag, / disabled=""/);
  assert.match(tag, /class="[^"]* opacity-disabled"/);
  assert.match(sendTag(composer({ canSubmit: false })), / disabled=""/, 'no hint to give: a plain disabled Send');
});

// uM's running placeholder (c227f4d5e ze/Be/He): the editor's copy, aria-description and the fit probe (lc.Overlay).
test('running with the queue lane: the editor names both lanes, with the spoken copy as aria-description and the original fit probe', async () => {
  const editor = editorTag;
  const running = composer({ running: true, draft: '', queueEnabled: true, placeholder: 'Type / for commands' });
  assert.equal(placeholderOf(running), 'Enter to send, Ctrl+Enter to queue for later', 'SSR: the non-mac server snapshot of the caps');
  assert.equal(ghostOf(running), undefined, 'a compact copy exists: uM placeholderFit "clamp", no grow ghost');
  assert.match(/<span data-composer-placeholder=""[^>]*class="([^"]*)"/.exec(running)[1], /(^| )truncate( |$)/, 'clamp: one truncated line');
  assert.doesNotMatch(editor(running), /data-placeholder=/, 'the editor no longer carries the copy (::before)');
  assert.match(editor(running), /aria-description="Enter to send, Ctrl\+Enter to queue for later"/);
  assert.doesNotMatch(editor(running), / title=/, 'the full copy fits (no overflow measured in SSR)');
  // composer-shell: the probe is an lc.Overlay child (the shell's ChatComposerOverlay over the editor row), verbatim uM.
  assert.match(running, /<div data-cds="ChatComposerOverlay" class="absolute inset-0 overflow-hidden [^"]*pointer-events-none"><div aria-hidden="true" data-placeholder-fit-probe="Enter to send, Ctrl\+Enter to queue for later" class="invisible me-px whitespace-nowrap before:content-\[attr\(data-placeholder-fit-probe\)\]"><\/div><\/div>/);
  assert.equal(C.PLACEHOLDER_FIT_PROBE_CLASS, 'invisible me-px whitespace-nowrap before:content-[attr(data-placeholder-fit-probe)]');
  const chunk = await import('node:fs/promises').then(fs => fs.readFile(path.resolve(import.meta.dirname, '../../analysis/code-ui-unpack-20261017/readable/c227f4d5e-Ba-r--Rl.js'), 'utf8'));
  assert.ok(chunk.includes(JSON.stringify(C.PLACEHOLDER_FIT_PROBE_CLASS)), 'the probe class is uM\'s, verbatim');
  // ze off: no queue lane (cmdEnterClaimed), idle, interrupting, submit blocked, or a Ctrl+R search; bash keeps its copy.
  for (const props of [{ running: true, draft: '' }, { draft: '' }, { running: true, stopping: true, draft: '', queueEnabled: true }, { running: true, draft: '', queueEnabled: true, canSubmit: false }]) {
    const html = composer({ ...props, placeholder: 'Type / for commands' });
    assert.equal(placeholderOf(html), 'Type / for commands', JSON.stringify(props));
    assert.equal(ghostOf(html), 'Type / for commands', 'no compact copy: grow, one ghost line');
    assert.doesNotMatch(editor(html), /aria-description/);
    assert.doesNotMatch(html, /data-placeholder-fit-probe/);
  }
  const bash = composer({ draft: '!', shellMode: 'core' });
  assert.equal(placeholderOf(bash), 'Enter a shell command'); assert.equal(ghostOf(bash), 'Enter a shell command', 'bash mode: grow (U)');
  assert.match(editor(bash), /aria-description="Enter a shell command"/);
  const suggested = composer({ draft: '', suggestion: 'Run the tests', running: true, queueEnabled: true });
  assert.equal(placeholderOf(suggested), undefined, 'a shown suggestion clears it (K ? "")'); assert.equal(ghostOf(suggested), undefined);
});

// TT-04 lesson: lM's classes live in the loaded @layer utilities sheet, so the host must not shadow them with unlayered
// rules. Every class the Send cell and the fit probe render is compiled there (except the uncompiled stacks: theme
// variant), the host's legacy native-button reset is released for those buttons, and no local rule styles lM's DOM.
test("lM's and the fit probe's classes are all in the official sheet, and the host's button reset is released for them", async () => {
  const fsp = await import('node:fs/promises');
  const sheet = await fsp.readFile(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  const html = [composer({ draft: '' }), composer({ draft: 'hi' }), composer({ draft: '', running: true }), composer({ draft: 'hi', sending: true }),
    composer({ draft: 'hi', canSubmit: false, connectingHint: 'x' }), composer({ draft: '', running: true, queueEnabled: true })].join('');
  // Each code-prompt-trailing-controls subtree, cut at its matching </div>.
  const subtree = (text, start) => { let depth = 0; for (const tag of text.slice(start).matchAll(/<div\b|<\/div>/g)) { depth += tag[0] === '</div>' ? -1 : 1; if (!depth) return text.slice(start, start + tag.index + 6); } return ''; };
  const cells = [...html.matchAll(/<div data-testid="code-prompt-trailing-controls"/g)].map(m => subtree(html, m.index));
  assert.equal(cells.length, 6);
  const probe = /<div aria-hidden="true" data-placeholder-fit-probe="[^"]*" class="([^"]*)"/.exec(html)?.[1] ?? '';
  const tokens = new Set([...cells.join('').matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).concat(probe.split(/\s+/))
    .filter(t => t && !t.startsWith('stacks:') && !t.startsWith('sc-')).map(t => t.replaceAll('&amp;', '&')));
  assert.ok(tokens.size > 40, String(tokens.size));
  const escape = token => '.' + token.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
  const missing = [...tokens].filter(token => !['{', ':', ',', '[', ' ', '>', ')'].some(next => sheet.includes(escape(token) + next)));
  assert.deepEqual(missing, []);
  const css = await fsp.readFile(path.resolve(import.meta.dirname, '../src/source-composer.css'), 'utf8');
  // D26 (R3-style): the native-button reset is layered, so lM's CdsButton needs no revert-layer release
  // (tests/style-control-reset-layer.test.mjs resolves the cascade).
  assert.doesNotMatch(css, /\.sc-input-row button\[data-cds="Button"\]/, 'no release of the layered button reset');
  assert.doesNotMatch(css, /code-prompt|size-control|scale-90|justify-items-end/, 'no local rule on lM\'s DOM');
});

// lM under a minimal hook dispatcher: the element tree of one render, whose Send / Stop props are pressed directly.
function shallow(props) {
  const hooks = {
    useMemo: fn => fn(), useCallback: fn => fn, useRef: initial => ({ current: initial }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useLayoutEffect() {}, useEffect() {}, useContext: context => context._currentValue, useSyncExternalStore: (_subscribe, get) => get(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = hooks;
  try { return Cell.ComposerSendCell(props); } finally { internal.H = old; }
}
function find(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { for (const node of tree) find(node, predicate, out); return out; }
  if (predicate(tree)) out.push(tree);
  for (const value of Object.values(tree.props ?? {})) if (value && typeof value === 'object') find(value, predicate, out);
  return out;
}
test('Stop then Send within Qj (500ms) ignores the Send press; after it the press submits with the click steer options', async () => {
  const { composerTextStore } = await server.ssrLoadModule('/src/source-composer-current-adapters.jsx');
  const submits = [], stopClickAtRef = { current: -Infinity };
  const base = { hasTextStore: composerTextStore(() => true), hasAttachments: false, submitBlocked: false, submitQueued: false, busy: true,
    isBashMode: false, isCoarsePointer: false, plainEnterSends: true, draftStoreKey: 's', handleSubmit: options => submits.push(options),
    clickSteerOptions: () => ({ priority: 'next' }), stopClickAtRef, enableQueueVsSteer: false, swapToSendOnDraft: false, enableForkSubmit: false,
    stayOnDraftHint: false, escapeClaimed: false, cmdEnterClaimed: true, sendOnDraftOnly: true, idleSendAction: null };
  // The host's handleStopClick (SourceComposer): stamp the press, then stop.
  const stops = [];
  const handleStopClick = trigger => { stopClickAtRef.current = Date.now(); stops.push(trigger); };
  const running = shallow({ ...base, showStop: true, handleStopClick });
  const [stop] = find(running, node => node.props?.['data-testid'] === 'code-prompt-stop');
  stop.props.onClick(); assert.deepEqual(stops, ['button']);
  const ended = shallow({ ...base, busy: false, showStop: false, handleStopClick });
  const [send] = find(ended, node => node.props?.['data-testid'] === 'code-prompt-send');
  const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  send.props.onMouseDown(event); assert.equal(event.defaultPrevented, true, 'vA: the press keeps the editor focused');
  send.props.onClick(); assert.deepEqual(submits, [], 'within 500ms of Stop');
  stopClickAtRef.current = Date.now() - 500;
  send.props.onClick(); assert.deepEqual(submits, [{ priority: 'next' }], 'f(p()): handleSubmit(clickSteerOptions())');
  const source = await import('node:fs/promises').then(fs => fs.readFile(path.resolve(import.meta.dirname, '../src/source-composer.jsx'), 'utf8'));
  assert.match(source, /const handleStopClick = \(trigger\) => \{\n\s*stopClickAt\.current = Date\.now\(\);\n\s*setSearch\(null\);\n\s*onStop\?\.\(\{ trigger \}\);/);
  assert.match(source, /handleStopClick=\{handleStopClick\} stopClickAtRef=\{stopClickAt\}/);
  assert.match(source, /const stopClickAt = useRef\(-Infinity\);/, 'OP Et = T(-1 / 0)');
  assert.doesNotMatch(source, /sc-submit|function SubmitCrossfade/, 'no hand-written Send/Stop cell left');
});

// Round-2 walk a10: the Home pet (80px sprite at the composer's top-right) covered the warning row's Retry.
test('a warning row under the Home pet reserves the pet’s width and keeps Retry above the sprite', async () => {
  // SourcePet reads matchMedia / document during render; SSR gets inert stand-ins for this one render.
  const stubs = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), document: { documentElement: { dataset: {} } } };
  const added = Object.keys(stubs).filter(key => !(key in globalThis));
  for (const key of added) globalThis[key] = stubs[key];
  let withPet;
  try { withPet = composer({ canSubmit: false, warning: 'Connection to DeepSeek lost.', onReconnect: noop, showPet: true }); }
  finally { for (const key of added) delete globalThis[key]; }
  assert.match(withPet, /<div class="sc-warning-row" role="status" data-cds-composer-warning="" data-pet="true">/);
  assert.doesNotMatch(composer({ canSubmit: false, warning: 'Connection to DeepSeek lost.', onReconnect: noop }), /data-pet/);
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-composer.css'), 'utf8');
  // The sprite's box is the generated cc43287c9 O7 (R3-home: SourcePet draws clawdClassName; the old local .sc-pet rules
  // no longer matched and were removed).
  const { clawdClassName } = await import('../src/generated/code-start/pet.mjs');
  const pet = /right-\[(-?\d+)px\].*\bw-\[(\d+)px\]/.exec(clawdClassName);
  const pad = /\.sc-warning-row\[data-pet\] \{ padding-right: (\d+)px; \}/.exec(css);
  assert.ok(pet && pad, 'pet geometry and row padding');
  assert.ok(Number(pad[1]) >= Number(pet[2]) + Number(pet[1]), 'the padding clears the sprite box inside the column');
  assert.doesNotMatch(css, /\.sc-pet\s*\{/, 'no local .sc-pet rule');
  assert.match(css, /\.sc-warning-action \{ position: relative; z-index: 3; \}/, 'Retry stacks above the pet slot (z-index 2)');
});

// Round-2 walk b4/b5: before init() settles the saved mode is unknown; the chip must not claim Auto.
test('permission null (saved mode not loaded) renders a disabled, busy "Mode" chip instead of a mode', () => {
  const chip = html => /<button[^>]*class="[^"]*sc-permission[^"]*"[^>]*>.*?<\/button>/.exec(html)?.[0] ?? '';
  const loading = chip(composer({ permission: null, canSubmit: false }));
  assert.match(loading, / disabled=""/); assert.match(loading, /aria-busy="true"/);
  assert.match(loading, />Mode</); assert.doesNotMatch(loading, /Auto/);
  const plan = chip(composer({ permission: 'plan' }));
  assert.doesNotMatch(plan, / disabled=""/); assert.match(plan, /Plan/);
});
test('the connecting hint is not shown until Enter is refused, and main wires it to the startup and session-load gates', async () => {
  assert.doesNotMatch(composer({ canSubmit: false, connectingHint: 'Still connecting to DeepSeek. Try again in a moment.' }), /Still connecting/);
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-composer.jsx'), 'utf8');
  assert.match(source, /if \(!canSend\) \{\n\s*if \(connectingHint && hasContent && !hostCommand && !running\) setBlockedSubmit\(true\);/);
  const main = await fs.readFile(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.match(main, /permission=\{boot \|\| initSettled \? effectivePermission : null\}/);
  assert.match(main, /connectingHint=\{!boot\?\.connected && \(loading \|\| !initSettled\)/);
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(typeof zh['Still connecting to DeepSeek. Try again in a moment.'], 'string');
});
