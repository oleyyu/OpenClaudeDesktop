// W14-code r6 sleep lane: the Code column's sleep and kept-awake bands are the original 3.6556.2 ones — cf74bc599 wO / dO
// (generated/session-rail/sleep-band.mjs) over the c73f45bc3 k_ band card (code-band.mjs), registered into the c227f4d5e
// notice slot table (generated/composer-notices/code-notice-slots.mjs) and listed by the host's Rde follower
// (source-session-notices.jsx) in rI's order; the in-transcript variant goes to the transcript tail (c227f4d5e uY → GG).
// Also sh6-04 (the trust dialog stays open until the trust is saved).
//
// Effects are what register a band (uI's layout effect) and write the tail notice (pY), and react-dom/server runs none,
// so the wiring is driven by a small hook harness: a one-tree renderer whose dispatcher keeps each component's hooks
// across passes, runs effects after a pass and renders again until nothing changes. It descends into the host and
// generated components and stops at ChatComposerNotices (its `items` are what Rde hands RM). The card itself is then
// drawn with react-dom/server. Nothing of the official chunk is executed; the generated slices are.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const snapshot = path.join(root, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(snapshot, file), 'utf8');

const { createServer } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
test.after(() => server.close());
const load = (file) => server.ssrLoadModule(file);

const MEMO = Symbol.for('react.memo'), FORWARD = Symbol.for('react.forward_ref'), CONTEXT = Symbol.for('react.context'), FRAGMENT = Symbol.for('react.fragment');
const SENTINEL = Symbol.for('react.memo_cache_sentinel');
const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const depsChanged = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

/** Render `element` with persistent hooks until stable. `stops`: components not entered ({type → capture(props)}). */
function harness(element, stops = new Map(), beforePass = () => {}) {
  const instances = new Map();
  let dirty = true, effects = [];
  const pass = () => {
    effects = [];
    beforePass();
    const seen = new Set();
    const walk = (node, key, contexts) => {
      if (node === null || node === undefined || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return;
      if (Array.isArray(node)) { node.forEach((child, index) => walk(child, `${key}/${child?.key ?? index}`, contexts)); return; }
      if (typeof node !== 'object' || !('type' in node)) return;
      let { type } = node; const props = node.props ?? {};
      if (stops.has(type)) { stops.get(type)(props); return; }
      if (type === FRAGMENT || typeof type === 'string') { walk(props.children, `${key}>`, contexts); return; }
      if (type?.$$typeof === CONTEXT) { walk(props.children, `${key}>`, new Map(contexts).set(type, props.value)); return; }
      let forwarded = false;
      if (type?.$$typeof === MEMO) type = type.type;
      if (type?.$$typeof === FORWARD) { type = type.render; forwarded = true; }
      if (stops.has(type)) { stops.get(type)(props); return; }
      if (typeof type !== 'function') return;
      const id = `${key}:${type.name}`;
      seen.add(id);
      let instance = instances.get(id);
      if (!instance) instances.set(id, (instance = { hooks: [], cleanups: new Map() }));
      let index = 0;
      const slot = () => index++;
      const dispatcher = {
        useState(initial) {
          const i = slot();
          if (!(i in instance.hooks)) instance.hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
          const cell = instance.hooks[i];
          cell.set ??= (next) => { const value = typeof next === 'function' ? next(cell.value) : next; if (!Object.is(value, cell.value)) { cell.value = value; dirty = true; } };
          return [cell.value, cell.set];
        },
        useReducer(reducer, arg, init) { const [state, set] = dispatcher.useState(() => (init ? init(arg) : arg)); return [state, (action) => set((s) => reducer(s, action))]; },
        useRef(initial) { const i = slot(); if (!(i in instance.hooks)) instance.hooks[i] = { current: initial }; return instance.hooks[i]; },
        useMemo(create, deps) { const i = slot(); const cell = instance.hooks[i]; if (!cell || depsChanged(cell.deps, deps)) instance.hooks[i] = { value: create(), deps }; return instance.hooks[i].value; },
        useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
        useContext(context) { return contexts.has(context) ? contexts.get(context) : context._currentValue; },
        useEffect(create, deps) {
          const i = slot(); const cell = instance.hooks[i];
          if (!cell || depsChanged(cell.deps, deps)) { instance.hooks[i] = { deps }; effects.push(() => { instance.cleanups.get(i)?.(); const cleanup = create(); instance.cleanups.set(i, typeof cleanup === 'function' ? cleanup : undefined); }); }
        },
        useSyncExternalStore(subscribe, getSnapshot) {
          const i = slot(); const value = getSnapshot();
          const cell = instance.hooks[i] ?? (instance.hooks[i] = {});
          if (cell.subscribe !== subscribe) { cell.unsubscribe?.(); cell.subscribe = subscribe; cell.unsubscribe = subscribe(() => { dirty = true; }); }
          return value;
        },
        useMemoCache(size) { const i = slot(); if (!(i in instance.hooks)) instance.hooks[i] = Array(size).fill(SENTINEL); return instance.hooks[i]; },
        useId() { const i = slot(); return instance.hooks[i] ??= `:h${id.length}-${i}:`; },
        useDebugValue() {}, useImperativeHandle() { slot(); }, useTransition() { return [false, (fn) => fn()]; }, useDeferredValue: (value) => value,
        use(value) { return value?.$$typeof === CONTEXT ? dispatcher.useContext(value) : value; },
      };
      dispatcher.useLayoutEffect = dispatcher.useEffect; dispatcher.useInsertionEffect = dispatcher.useEffect;
      const previous = internals.H; internals.H = dispatcher;
      let output;
      try { output = forwarded ? type(props, node.ref ?? props.ref ?? null) : type(props); } finally { internals.H = previous; }
      walk(output, `${id}>`, contexts);
    };
    walk(element, '', new Map());
    for (const [id, instance] of instances) if (!seen.has(id)) { for (const cleanup of instance.cleanups.values()) cleanup?.(); instances.delete(id); }
    for (const effect of effects) effect();
  };
  for (let round = 0; dirty && round < 30; round++) { dirty = false; pass(); }
  assert.equal(dirty, false, 'the harness settles');
  return { rerender(next) { element = next; dirty = true; for (let round = 0; dirty && round < 30; round++) { dirty = false; pass(); } },
    unmount() { for (const instance of instances.values()) for (const cleanup of instance.cleanups.values()) cleanup?.(); instances.clear(); } };
}

const Sleep = await load('/src/source-sleep-notice.jsx');
const Notices = await load('/src/source-session-notices.jsx');
const Model = await load('/src/kept-awake-model.mjs');
const { ChatComposerNotices } = await load('/src/generated/composer-notices/composer-notices.mjs');
const h = React.createElement;
const value = { suspendedAt: Date.UTC(2026, 0, 1, 9, 30), wakeAt: Date.UTC(2026, 0, 1, 10, 0) };

/** The region with the bands and the stack for `sessionId`; returns the RM items and the harness. */
function mountColumn({ sessionId, notices = [], bands = {} }) {
  const captured = { items: null };
  const scopeStore = bands.scopeStore ?? Sleep.createSessionBandsScopeStore();
  const tree = (extra = {}) => h(Sleep.SourceCodeNoticeRegion, { session: sessionId },
    h(Sleep.SourceSessionBands, { sessionId, scopeStore, config: {}, saveSettings() {}, sendContinue: async () => {}, ...bands, ...extra }),
    h(Notices.SourceSessionNotices, { notices, inColumn: true }));
  // Each pass starts from none. (W14-code r7 r7c-03: inside the region the stack is Rde, which always draws its div and RM —
  // `p("div", { ref: a, …, children: p(Os, { items: c, … }) })` — so RM is reached with [] once no band is registered.)
  const run = harness(tree(), new Map([[ChatComposerNotices, (props) => { captured.items = props.items; }]]), () => { captured.items = null; });
  return { captured, scopeStore, run, tree };
}
/** One RM item's card as react-dom/server draws it (inside the region, so dI's stamp matches the session). */
const card = (sessionId, item) => renderToStaticMarkup(h(Sleep.SourceCodeNoticeRegion, { session: sessionId }, item.content.render({ leaving: false })));

test('r6 official pins: the slot table, k_ registration, wO / EO / DO, dO / pO and Rde', () => {
  const slots = official('c227f4d5e-B-FYKrwT.js'), band = official('c73f45bc3-B7hbL7H9.js'), rail = official('cf74bc599-CRYqipWN.js'), code = official('cc43287c9-Me-M2ucD.js');
  for (const s of ['rI=["ops","paused","environment","acorn","credits","effort","workflow","limit","refusal","sleep","keptAwake","bridge","hostSandbox","repository","credentialNudge"]',
    'register(e,t,n){let r={notice:dI(t,n),early:!a.current}', 'id:`${t}:${e.id}`']) assert.ok(slots.includes(s), s);
  for (const s of ['render:e=>{let{leaving:t}=e;return i($g,{holder:s,leaving:t,testId:`code-${a}-card`})}', 'wordsClassName:"flex flex-wrap items-baseline gap-x-2.5 gap-y-0.75"', 'Qg as ht'])
    assert.ok(band.includes(s), s);
  for (const s of ['s(k_,{slot:"sleep",id:"sleep",...n,inBand:TO})', 's(k_,{slot:"keptAwake",id:"kept-awake",...pO(a,{', 'Wm(r,"sleepNotice",Ie)', 'Wm(r,"keepAwakeNotice",ke)'])
    assert.ok(rail.includes(s), s);
  assert.ok(code.includes('key:P7(t,r.id),content:r.content,dismissible:r.onDismiss!==void 0&&r.dismissible,skipEnter:i||!s'));
  // The generated slices carry the originals (no hand-built band left in the host).
  const generated = read('src/generated/session-rail/sleep-band.mjs');
  for (const s of ['slot: "sleep",', 'slot: "keptAwake",', 'version: "rework",', '"ccd_sleep_band_keep_awake_main"']) assert.ok(generated.includes(s), s);
  assert.match(read('src/generated/session-rail/code-band.mjs'), /testId: `code-\$\{a\}-card`/);
  const model = read('src/kept-awake-model.mjs');
  assert.doesNotMatch(model, /export function (sleepNotice|keptAwakeNotice|keptAwakeShownFor|sleepResumeState)|KEPT_AWAKE_MESSAGES = /);
  assert.equal(fs.existsSync(path.join(root, 'src/source-kept-awake-notice.jsx')), false);
});

test('r6 sleep band: wO registers k_ in the "sleep" slot; Rde orders workflow → limit → sleep, then the host notices', async () => {
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-a', sleepInterruption: value });
  const notices = [
    { kind: 'hooks', level: 'info', summary: 'Hooks are running', details: null, dismissKey: 'hooks' },
    { kind: 'usage', level: 'warning', summary: 'Usage limit reached', details: null, dismissKey: 'usage', slot: 'limit' },
    { kind: 'workflowSize', level: 'warning', summary: 'Large workflow', details: null, dismissKey: 'wf', slot: 'workflow' },
  ];
  const { captured, run } = mountColumn({ sessionId: 'r6-a', notices });
  assert.deepEqual(captured.items.map((item) => item.key), ['wf', 'usage', 'code-sleep:r6-a:sleep', 'hooks']);
  const sleep = captured.items[2];
  assert.equal(sleep.dismissible, false, 'k_ entries carry no notice-level dismiss (the card has its own)');
  // Rde's `skipEnter: i || !s`: the stack is not inside a [data-band-enter] (s false), so the band does not animate in.
  assert.equal(sleep.skipEnter, true, 'no [data-band-enter] around the stack');
  const html = card('r6-a', sleep);
  assert.match(html, /data-testid="code-sleep-card"/);
  assert.match(html, /class="flex flex-wrap items-baseline gap-x-2\.5 gap-y-0\.75"/);
  // DO "rework" (vO unknown), not running: q "needed" — Continue; E83: the persona (DeepSeek by default) for Claude.
  assert.match(html, /Your computer went to sleep while DeepSeek was working\./);
  assert.match(html, /DeepSeek couldn’t pick up where it left off\./);
  assert.match(html, />Continue</);
  assert.doesNotMatch(html, /Continue in cloud|Cloud sessions/);
  run.unmount();
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-a', sleepInterruption: null });
});

test('r6 sleep band: keep awake off offers "Keep computer awake" (gO), which writes keepAwake; Continue stops then sends afterSleep', async () => {
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-b', sleepInterruption: value });
  const patches = [], sent = [], stops = [];
  const { captured, run } = mountColumn({ sessionId: 'r6-b', bands: { config: { keepAwake: false }, running: true, saveSettings: (p) => patches.push(p),
    stopSession: async () => { stops.push(1); }, sendContinue: async (text) => { sent.push(text); } } });
  const sleep = captured.items.find((item) => item.key === 'code-sleep:r6-b:sleep');
  assert.ok(sleep, 'band registered');
  const html = card('r6-b', sleep);
  // running and within 75s of the wake: q "expected" (no Continue); the keep-awake teach line and CTA.
  assert.match(html, /DeepSeek will pick up where it left off\. Keep your computer awake so long tasks can finish\./);
  assert.match(html, />Keep computer awake</);
  assert.doesNotMatch(html, />Continue</);
  run.unmount();
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-b', sleepInterruption: null });
  // The CTA's onClick is e_'s onCta → wO Ce → gO enable → Xy("while_working", !0) → saveSettings({keepAwake: true}).
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-c', sleepInterruption: value });
  const second = mountColumn({ sessionId: 'r6-c', bands: { config: { keepAwake: false }, saveSettings: (p) => patches.push(p), running: true,
    stopSession: async () => { stops.push(1); }, sendContinue: async (text) => { sent.push(text); } } });
  const element = second.captured.items.find((item) => item.key === 'code-sleep:r6-c:sleep').content.render({ leaving: false });
  // Walk to e_'s props through the harness: fI → $g → e_ (props carry onCta / ctaLabel).
  let props = null;
  const { CodeBandCard } = await load('/src/generated/session-rail/code-band.mjs');
  harness(h(Sleep.SourceCodeNoticeRegion, { session: 'r6-c' }, element), new Map([[CodeBandCard, (p) => { props = p; }]])).unmount();
  assert.equal(props.ctaLabel, 'Keep computer awake');
  props.onCta();
  assert.deepEqual(patches, [{ keepAwake: true }]);
  second.run.unmount();
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-c', sleepInterruption: null });
  // Not running (q "needed"): Continue runs SO — stop (nothing runs: skipped), then the afterSleep send.
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-d', sleepInterruption: value });
  const third = mountColumn({ sessionId: 'r6-d', bands: { stopSession: async () => { stops.push(1); }, sendContinue: async (text) => { sent.push(text); } } });
  let cont = null;
  harness(h(Sleep.SourceCodeNoticeRegion, { session: 'r6-d' }, third.captured.items.find((item) => item.key === 'code-sleep:r6-d:sleep').content.render({ leaving: false })),
    new Map([[CodeBandCard, (p) => { cont = p; }]])).unmount();
  assert.equal(cont.ctaLabel, 'Continue');
  await cont.onCta();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(sent, ['My computer went to sleep while you were working. Please continue from where you left off.']);
  assert.deepEqual(stops, [], 'a session that does not run has nothing to stop');
  // Dismiss (e_ onDismiss → wO Se): the band unregisters.
  cont.onDismiss();
  third.run.rerender(third.tree());
  assert.equal((third.captured.items ?? []).some((item) => item.key === 'code-sleep:r6-d:sleep'), false);
  third.run.unmount();
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-d', sleepInterruption: null });
});

test('r6 R6T-03: in the transcript with no keep-awake offer, wO writes the urgent notice for the tail (uY → GG), no band', async () => {
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-t', sleepInterruption: value });
  const { captured, scopeStore, run } = mountColumn({ sessionId: 'r6-t', bands: { inTranscript: true } });
  assert.equal((captured.items ?? []).length, 0, 'no band in the column');
  const notice = scopeStore.getState().sleepNotice;
  assert.equal(notice.urgent, true);
  assert.equal(notice.message, 'Your computer went to sleep while DeepSeek was working. DeepSeek couldn’t pick up where it left off.');
  assert.match(notice.detail, /went to sleep at .+ and hasn’t made progress since it woke up\./);
  assert.deepEqual(notice.actions.map((action) => action.label), ['Continue']);
  const tail = renderToStaticMarkup(h(Sleep.SourceTailSessionNotice, { notice: (await load('/src/generated/composer-notices/code-notice-slots.mjs')).tailSessionNotice(scopeStore.getState()) }));
  assert.match(tail, /Your computer went to sleep while DeepSeek was working\./);
  assert.match(tail, />Continue</);
  run.unmount();
  assert.equal(scopeStore.getState().sleepNotice, null, 'pY clears it on unmount');
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-t', sleepInterruption: null });
  // main.jsx hands the tail notice to the Code transcript (host.transcriptNotices).
  const main = read('src/main.jsx');
  assert.ok(main.includes('transcriptNotices: bandsInTranscript && tailNotice ? <SourceTailSessionNotice key={`${current}:session-notice`} notice={tailNotice} /> : null,'));
});

test('r6 kept-awake band: dO registers k_ "keptAwake" (pO: CoffeeCup, the two actions); a send in the session marks it used', async () => {
  const storage = new Map();
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) } });
  try {
    Model.keptAwakeStore.observe({ kind: 'desktop-kept-awake', threadId: 'r6-k', keptAwake: { heldMs: 72 * 6e4, endedAt: 5 } });
    const patches = [];
    const { captured, run, tree } = mountColumn({ sessionId: 'r6-k', bands: { saveSettings: (p) => patches.push(p) } });
    const item = captured.items.find((entry) => entry.key === 'code-keptAwake:r6-k:kept-awake');
    assert.ok(item, 'kept-awake band registered');
    const html = card('r6-k', item);
    assert.match(html, /data-testid="code-keptAwake-card"/);
    assert.match(html, /DeepSeek kept your computer awake for 1 hr 12 min\./);
    assert.match(html, /This lets long tasks finish\. Your computer can sleep as usual now\./);
    assert.match(html, />Only when plugged in</); assert.match(html, />Don’t keep awake</);
    // Running hides it (dO te); another session has none.
    run.rerender(h(Sleep.SourceCodeNoticeRegion, { session: 'r6-k' }, h(Sleep.SourceSessionBands, { sessionId: 'r6-k', scopeStore: Sleep.createSessionBandsScopeStore(), config: {}, running: true }),
      h(Notices.SourceSessionNotices, { notices: [], inColumn: true })));
    assert.equal((captured.items ?? []).some((entry) => entry.key.startsWith('code-keptAwake')), false);
    run.rerender(tree());
    assert.ok(captured.items.some((entry) => entry.key.startsWith('code-keptAwake')));
    // Om / kh: the session's turn starts — the band is used (persisted) and keptAwake clears.
    Model.keptAwakeStore.observe({ method: 'turn/started', params: { threadId: 'r6-k' } });
    run.rerender(tree());
    assert.equal(storage.get('persisted.epitaxy-keep-awake-band-used'), 'true');
    assert.equal((captured.items ?? []).some((entry) => entry.key.startsWith('code-keptAwake')), false);
    run.unmount();
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
});

test('r6 sh6-04: the trust dialog stays open until the trust is saved, ignores a second accept, and stays after a failure', async () => {
  const notices = read('src/source-session-notices.jsx'), customize = read('src/source-customize.jsx'), main = read('src/main.jsx');
  assert.match(notices, /if \(!trustPrompt \|\| accepting\.current\) return;[^]*saved = await trustPrompt\.accept\(\);[^]*if \(saved !== false\) setTrustPrompt\(null\);/);
  assert.ok(notices.includes('onAccept={acceptTrust} onDecline={() => setTrustPrompt(null)} />'));
  assert.match(customize, /if \(trustAccepting\.current\) return;[^]*saved = await onAction\("trust", row\);[^]*if \(saved !== false\) setTrustPrompt\(false\);/);
  assert.ok(customize.includes('await store.loadMcp({ force: true }); return true; }'));
  assert.ok(main.includes('run: () => trustBridgeFolder(workdir) }] }'));
  assert.match(main, /async function trustProject\(\) \{\s*if \(trustingProject\) return false;[^]*await reconnect\(\);\s*return true;[^]*return false;\s*\}/);
  const off = official('c516e93ca-cR9_bRq_.js');
  assert.ok(off.includes('if(!(!N||z.current)){z.current=!0;try{await I(N.cwd,N.remote)}catch(e){'));
});

// r6 sleep review fix (只改 Code 模式): the slot table, rI's order and the k_ card are the Code session's (cc43287c9
// EpitaxySessionScopeBody is the only importer of cf74bc599 vA EpitaxySessionBands). Chat / Cowork mount the same bands
// without the region: k_ falls to c227f4d5e oL (InlineCodeBand), whose props go to the host sink, and the stack keeps its
// own order and its CdsBanner, as before this lane (workflow, hooks, …, headline, sleep, kept awake, usage).
function ChatStack({ sink, sessionId, before = [], after = [], bands = {} }) {
  const inline = Sleep.useInlineBandNotices(sink);
  const [scopeStore] = React.useState(Sleep.createSessionBandsScopeStore);
  return h(React.Fragment, null,
    h(Sleep.SourceSessionBands, { sessionId, scopeStore, config: {}, saveSettings() {}, sendContinue: async () => {}, inlineSink: sink, ...bands }),
    h(Notices.SourceSessionNotices, { notices: [...before, ...inline, ...after] }));
}
test('r6 review fix: Chat / Cowork keep the host order and CdsBanner bands; no Code slot, no k_ card', async () => {
  const off = official('cc43287c9-Me-M2ucD.js');
  assert.ok(off.includes('pick:e=>e.EpitaxySessionBands,options:{loading:Vc("usually-renders-nothing")},overlayHost:"EpitaxySessionScopeBody.'));
  const storage = new Map();
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) } });
  try {
    Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-w', sleepInterruption: value });
    Model.keptAwakeStore.observe({ kind: 'desktop-kept-awake', threadId: 'r6-x', keptAwake: { heldMs: 72 * 6e4, endedAt: 7 } });
    const before = [
      { kind: 'workflowSize', level: 'warning', summary: 'Large workflow', details: null, dismissKey: 'wf' },
      { kind: 'hooks', level: 'info', summary: 'Hooks are running', details: null, dismissKey: 'hooks' },
      { kind: 'workspaceHeadline', level: 'info', summary: 'Headline', details: null, dismissKey: 'headline' },
    ];
    const after = [{ kind: 'usage', level: 'warning', summary: 'Usage limit reached', details: null, dismissKey: 'usage' }];
    // Sleep (Cowork session r6-w).
    const captured = { items: null };
    const sink = Sleep.createInlineBandSink();
    const tree = () => h(ChatStack, { sink, sessionId: 'r6-w', before, after });
    const run = harness(tree(), new Map([[ChatComposerNotices, (props) => { captured.items = props.items; }]]), () => { captured.items = null; });
    const keys = captured.items.map((item) => item.key);
    assert.equal(keys.length, 5);
    assert.deepEqual([keys[0], keys[1], keys[2], keys[4]], ['wf', 'hooks', 'headline', 'usage'], 'the host order: usage stays last');
    assert.match(keys[3], /^sleep:\d+$/);
    assert.equal(keys.some((key) => key.startsWith('code-')), false, 'no Code slot entry');
    const html = renderToStaticMarkup(captured.items[3].content.render({ leaving: false }));
    assert.doesNotMatch(html, /code-sleep-card|gap-x-2\.5 gap-y-0\.75/, 'not the Code k_ card');
    assert.match(html, /class="ssn-summary"><bdi>Your computer went to sleep while DeepSeek was working\.<\/bdi>/);
    assert.match(html, /class="ssn-details"><bdi>DeepSeek couldn’t pick up where it left off\./);
    assert.match(html, />Continue</);
    // The banner's actions are wO's: Dismiss (the stack's onDismiss → the band's) takes it away.
    assert.equal(sink.band('sleep').ctaLabel, 'Continue');
    captured.items[3].content.render({ leaving: false }).props.onDismiss();
    run.rerender(tree());
    assert.deepEqual(captured.items.map((item) => item.key), ['wf', 'hooks', 'headline', 'usage']);
    run.unmount();
    // Kept awake (session r6-x): CoffeeCup, its message and two actions, in the same place.
    const sink2 = Sleep.createInlineBandSink();
    const captured2 = { items: null };
    const run2 = harness(h(ChatStack, { sink: sink2, sessionId: 'r6-x', before, after }), new Map([[ChatComposerNotices, (props) => { captured2.items = props.items; }]]), () => { captured2.items = null; });
    const keys2 = captured2.items.map((item) => item.key);
    assert.match(keys2[3], /^keptAwake:\d+$/); assert.equal(keys2[4], 'usage');
    const kept = renderToStaticMarkup(captured2.items[3].content.render({ leaving: false }));
    assert.doesNotMatch(kept, /code-keptAwake-card/);
    assert.match(kept, /DeepSeek kept your computer awake for 1 hr 12 min\./);
    assert.match(kept, />Only when plugged in</); assert.match(kept, />Don’t keep awake</);
    run2.unmount();
  } finally {
    Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r6-w', sleepInterruption: null });
    Model.keptAwakeStore.observe({ kind: 'desktop-kept-awake', threadId: 'r6-x', keptAwake: null });
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
  // main.jsx: the region, the bands' slots and the slot fields are Code's only. W14-code r7 notices (E81, cc43287c9 Ide
  // `r = Mt(Fde, !0) … if (!a) return n;` with Fde "__gb__100087145", not in Uon): and only under that gate or the
  // rollback switch local_code_notice_region; without the region Code's bands draw inline (w14-r7-notices.test.mjs).
  const main = read('src/main.jsx');
  assert.ok(main.includes('const codeNoticeSlots = mode === "code" && (hostGrowthBookFlag("__gb__100087145") || hostGrowthBookFlag("local_code_notice_region"));'));
  assert.ok(main.includes('inlineSink={mode === "code" ? null : inlineBandSink}'));
  assert.ok(main.includes('[codeNoticeSlots ? { ...workflowSizeNotice, slot: "workflow" } : workflowSizeNotice]'));
  assert.ok(main.includes('...(mode === "code" ? [] : inlineBandNotices),'));
  assert.ok(main.includes('...(usageNotice && !codeInline ? [{ ...usageNotice, ...(codeNoticeSlots ? { slot: "limit" } : {}), actions: usageNoticeActions }] : []),'));
  assert.ok(main.includes('return codeNoticeSlots ? <SourceCodeNoticeRegion session={current || null}>{bands}{stack}{approveOnce}</SourceCodeNoticeRegion> : <>{inlineCards}{bands}{stack}{approveOnce}</>;'));
});
