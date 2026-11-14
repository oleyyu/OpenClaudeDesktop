// W14-code r7 notices lane (r7c-03, r7c-02 = sh7-04 = gates-r7-01, sh7-03).
//
// - r7c-03: inside the Code notice region the stack is cc43287c9 Rde, which always draws its ref'd div around RM, items or
//   not, so the first slot band can see the stack's [data-band-enter] ancestor and play band-enter.
// - E81 gate: cc43287c9 Ide mounts the Code notice region only under __gb__100087145 (`var Fde = "__gb__100087145"; … r =
//   Mt(Fde, !0) … if (!a) return n;`), which is not in the desktop's Uon: off on the 3P desktop. Code then has no slot
//   table and no Rde stack; c73f45bc3 Qg (k_) / c227f4d5e rL / cc43287c9 h6 draw their band inline as c227f4d5e oL
//   (generated/session-rail/inline-band.mjs). local_code_notice_region is the rollback switch.
// - sh7-03: the auto-review denial's Approve once confirms in the CDS confirmation dialog (shared-frame ab), not
//   window.confirm.
// Nothing of the official chunk is executed; the generated slices are (react-dom/server and a small hook harness).
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
const h = React.createElement;

// The hook harness of w14-r6-sleep.test.mjs (effects run, passes repeat until stable).
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
const GB = await load('/src/host-growthbook.mjs');
const { InlineBand } = await load('/src/generated/session-rail/inline-band.mjs');

test('official pins: Ide gate, Rde, zde, Qg → oL, rL → oL, h6 → oL; __gb__100087145 only in cc43287c9', () => {
  const code = official('cc43287c9-Me-M2ucD.js'), slots = official('c227f4d5e-B-FYKrwT.js'), band = official('c73f45bc3-B7hbL7H9.js');
  for (const s of ['var Fde="__gb__100087145";function Ide(e){', 'r=Mt(Fde,!0)', 'if(!a)return n;', 'function zde(){let $=J9(1);return JE()?',
    'p("div",{ref:a,...u,className:Nl,children:p(Os,{items:c,onDismiss:l})})'])
    assert.ok(code.includes(s), s);
  assert.ok(band.includes('l===null?i(Fs,{kind:"notice",...r,...n}):null'));
  assert.ok(slots.includes('uI("limit",u,!0),J2($,18,u,r)?K2($,18,u,r,u===null?y(oL,{...r}):null):$[20]'));
  assert.ok(code.includes('p(uk,{kind:"warning",icon:"Warning",message:s,detail:l,ctaLabel:i.stopWorkflow,onCta:r.onStop,ctaBusy:r.stopPending,secondaryCtaLabel:u,onSecondaryCta:d,secondaryCtaBoxed:!0,onDismiss:r.onDismiss})'));
  const files = fs.readdirSync(snapshot).filter((file) => file.endsWith('.js') && fs.readFileSync(path.join(snapshot, file), 'utf8').includes('100087145'));
  assert.deepEqual(files, ['cc43287c9-Me-M2ucD.js']);
});

test('E81: __gb__100087145 is not served, the rollback switch is closed; main.jsx gates the region on them', () => {
  assert.equal(Object.hasOwn(GB.HOST_GROWTHBOOK, '__gb__100087145'), false);
  assert.equal(GB.hostGrowthBookFlag('__gb__100087145'), false);
  assert.equal(GB.hostGrowthBookFlag('local_code_notice_region'), false);
  assert.equal(Object.hasOwn(GB.HOST_GROWTHBOOK, GB.growthBookFlagKey('local_code_notice_region')), true, 'listed so the switch is findable');
  const main = read('src/main.jsx');
  assert.ok(main.includes('const codeNoticeSlots = mode === "code" && (hostGrowthBookFlag("__gb__100087145") || hostGrowthBookFlag("local_code_notice_region"));'));
  assert.ok(main.includes('const codeInline = mode === "code" && !codeNoticeSlots;'));
  assert.ok(main.includes('<SourceInlineWorkflowBand key="workflow-size" notice={workflowSizeNotice} />'));
  assert.ok(main.includes('<SourceInlineUsageBand key="usage" notice={usageNotice} actions={usageNoticeActions} />'));
  assert.ok(main.includes(': <>{inlineCards}{bands}{stack}{approveOnce}</>;'));
  // The adapter no longer refuses outside the region: it draws the sliced oL.
  const adapters = read('src/source-session-rail-adapters.jsx');
  assert.ok(adapters.includes('if (!slot) return <InlineBand {...props} />;'));
  assert.doesNotMatch(adapters, /the inline band outside the Code notice region/);
});

test('generated oL: the band frame, gauge glyphs and words row are the original', () => {
  const inline = read('src/generated/session-rail/inline-band.mjs'), frame = read('src/generated/session-rail/band-frame.mjs');
  for (const s of ['standsInForComposer: w,', 'I = k ? "note" : "status",', 'className: "flex flex-wrap items-baseline gap-x-2.5 gap-y-0.75",'])
    assert.ok(inline.includes(s), s);
  assert.match(inline, /name:\s+t === "approaching" \? "UsageGaugeMiddle" : "UsageGaugeHigh",/);
  for (const s of ['"flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm"', 'standsInForComposer: y,']) assert.ok(frame.includes(s), s);
  const manifest = JSON.parse(read('src/generated/session-rail/manifest.json'));
  for (const target of ['inline-band.mjs', 'band-frame.mjs', 'band-frame-classes.mjs'])
    assert.ok(manifest.modules.some((m) => m.target === target), target);
  // W14-code r7 gen-final-7 (D1): the frame's shared-2 B5 and shared-6 C_ are one copy each, imported from the areas that
  // already slice them (cowork-session-states' shared-2, session-rail-changes' branch-row-classes), not sliced again.
  assert.ok(!manifest.modules.some((m) => m.target === 'composer-stand-in.mjs'));
  assert.ok(frame.includes('import { B5 as l } from "../cowork-session-states/shared-2-TF8v67kg.mjs";'));
  assert.ok(frame.includes('import { bandAccentClassName as c } from "../session-rail-changes/branch-row-classes.mjs";'));
});

test('r7c-03: in the region the stack div (and RM) render with no item; outside it nothing', () => {
  const inRegion = renderToStaticMarkup(h(Sleep.SourceCodeNoticeRegion, { session: 'r7-a' }, h(Notices.SourceSessionNotices, { notices: [], inColumn: true })));
  assert.match(inRegion, /^<div class="-mb-1\.5 compact:-mb-1\.5 comfortable:-mb-2" data-cds-dock-group="" data-code-column-notices="">/);
  assert.match(inRegion, /data-cds="ChatComposerNotices"/);
  assert.match(inRegion, /role="status" aria-live="polite" aria-atomic="false"/);
  assert.equal(renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [], inColumn: true })), '');
  assert.equal(renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [] })), '');
  // Host notices outside the region still draw the stack.
  const host = renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [{ kind: 'warning', summary: 'Heads up', details: null }], inColumn: true }));
  assert.match(host, /data-code-column-notices=""/); assert.match(host, /Heads up/);
});

const value = { suspendedAt: Date.UTC(2026, 0, 1, 9, 30), wakeAt: Date.UTC(2026, 0, 1, 10, 0) };
test('gate off: the sleep band (k_) draws inline as oL — no Code slot, no k_ card', async () => {
  Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r7-s', sleepInterruption: value });
  try {
    // Walk the bands without a region or a sink: k_ reaches InlineCodeBand, which draws oL (captured, then drawn).
    let props = null, regionCard = false;
    const { CodeBandCard } = await load('/src/generated/session-rail/code-band.mjs');
    harness(h(Sleep.SourceSessionBands, { sessionId: 'r7-s', scopeStore: Sleep.createSessionBandsScopeStore(), config: {}, saveSettings() {}, sendContinue: async () => {} }),
      new Map([[InlineBand, (p) => { props = p; }], [CodeBandCard, () => { regionCard = true; }]])).unmount();
    assert.equal(regionCard, false);
    assert.equal(props.kind, 'notice', 'Qg: `i(Fs, {kind: "notice", ...r, ...n})`');
    const html = renderToStaticMarkup(h(InlineBand, props));
    assert.doesNotMatch(html, /code-sleep-card/, 'not the region card');
    assert.match(html, /role="status" aria-live="polite"/, 'oL: role status, polite (no hub tool approval body)');
    assert.match(html, /class="flex flex-wrap items-baseline gap-x-2\.5 gap-y-0\.75"/);
    assert.match(html, /class="min-w-0 text-primary">Your computer went to sleep while DeepSeek was working\./);
    assert.match(html, />Continue</);
  } finally {
    Model.sleepInterruptionStore.observe({ kind: 'desktop-sleep-interruption', threadId: 'r7-s', sleepInterruption: null });
  }
});

test('gate off: the usage band (rL → oL) and the workflow size band (h6 → oL) draw inline', () => {
  const approaching = { kind: 'usage', level: 'warning', summary: 'Approaching session usage limit', details: 'Resets 5:00 PM', dismissKey: 'usage:primary:1', reset: false };
  const html = renderToStaticMarkup(h(Notices.SourceInlineUsageBand, { notice: approaching, actions: [{ label: 'View usage', run() {} }] }));
  assert.match(html, /Approaching session usage limit/); assert.match(html, /Resets 5:00 PM/); assert.match(html, />View usage</);
  assert.match(html, /aria-label="Dismiss"|>Dismiss</, 'approaching: dismissible');
  assert.equal(Notices.inlineUsageKind(approaching), 'approaching');
  const reached = { kind: 'usage', level: 'danger', summary: 'Session limit reached', details: 'Resets in 20 min', dismissKey: 'usage:rate_limit_reached:1', reset: false, nudge: null };
  assert.equal(Notices.inlineUsageKind(reached), 'exceeded');
  assert.equal(Notices.inlineUsageKind({ ...reached, level: 'info' }), 'notice');
  const reachedHtml = renderToStaticMarkup(h(Notices.SourceInlineUsageBand, { notice: reached, actions: [{ label: 'Request sent to admin', disabled: true, run() {} }] }));
  assert.match(reachedHtml, /class="min-w-0 text-danger">Session limit reached/);
  assert.doesNotMatch(reachedHtml, /aria-label="Dismiss"|>Dismiss</, 'reached: tL passes no onDismiss');
  assert.match(reachedHtml, /disabled=""[^>]*>|aria-disabled/);
  const workflow = { kind: 'workflowSize', summary: 'This workflow is larger than most.', details: 'Up to 12 agents scheduled, more than most workflows use.',
    onDismiss() {}, stop: { label: 'Stop workflow', busy: false, run() {} } }; // W14-code r8 sh8-02: stop / view are their own fields
  const wf = renderToStaticMarkup(h(Notices.SourceInlineWorkflowBand, { notice: workflow }));
  assert.match(wf, /class="min-w-0 text-warning">This workflow is larger than most\./);
  assert.match(wf, /Up to 12 agents scheduled/); assert.match(wf, />Stop workflow</);
  assert.equal(renderToStaticMarkup(h(Notices.SourceInlineWorkflowBand, { notice: null })), '');
  // composerUsageNotice marks a reached limit with `nudge` (possibly null) and an approaching one without it.
  const usage = read('electron/usage-model.mjs');
  // (W14-code r8 r8c-01 / r8c-02: the reached return adds activeOverage for credits in use, the approaching one its
  // window / threshold / validUntil; neither adds `nudge` to the approaching notice.)
  assert.ok(usage.includes("reset: limit.reset === true, nudge: limit.nudge ?? null,"));
  assert.match(usage, /return \{kind: 'usage', level: percent >= 90 \? 'danger' : 'warning', summary, details: reset, dismissKey: `usage:\$\{fullest\.slot\}:\$\{fullest\.window\.resetsAt \?\? ''\}`, reset: false,\n  window: /);
  // oL directly: the reached gauge is the danger UsageGaugeHigh, the approaching one the muted UsageGaugeMiddle.
  assert.notEqual(renderToStaticMarkup(h(InlineBand, { kind: 'exceeded', message: 'x' })), renderToStaticMarkup(h(InlineBand, { kind: 'approaching', message: 'x' })));
});

test('sh7-03: Approve once opens the CDS confirmation dialog; confirm then approveDeniedOnce', async () => {
  const frame = official('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('variant:"secondary",disabled:A'), 'ab Cancel'); assert.ok(frame.includes('busy:A'), 'ab Confirm');
  const main = read('src/main.jsx');
  assert.equal(main.includes('window.confirm(t("Let {core} retry this once?'), false);
  assert.ok(main.includes('run: () => setApproveOncePrompt({ review: state.autoReviews[current][notice.reviewId], pending: false }) }] }'));
  assert.ok(main.includes('<SourceConfirmationDialog key="approve-once" title={t("Let {core} retry this once?", { core: coreName(boot?.core) })}'));
  assert.match(main, /const confirmApproveOnce = \(\) => \{[^]*?setApproveOncePrompt\(\{ \.\.\.prompt, pending: true \}\);\s*Promise\.resolve\(approveDeniedOnce\(prompt\.review\)\)\.catch\(actionFailed\("approve-once"\)\)\.finally\(\(\) => setApproveOncePrompt\(null\)\);/);
  const { default: zh } = await import('../electron/i18n/zh-CN/session.mjs');
  assert.equal(zh['Let {core} retry this once?'], '要让 {core} 重试一次吗？');
  assert.equal(zh['Let {core} retry this once? {action}'], undefined, 'the window.confirm sentence is gone');
  // The dialog itself: title, the action summary, Cancel / Approve once.
  const { SourceConfirmationDialog } = await load('/src/source-dialog.jsx');
  assert.equal(typeof SourceConfirmationDialog, 'function');
});
