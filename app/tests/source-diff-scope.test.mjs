import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { DEFAULT_DIFF_SCOPE, UNCOMMITTED_DIFF_SCOPE, diffScopeTrigger } from '../src/diff-scope-model.mjs';

// zm trigger (panes-tile-current.js:3060-3105): ghost TriggerButton `shrink min-w-0 text-secondary`,
// aria-label "Diff scope: {label}", the branch label grid with an xs ArrowRight (alt "to").
let server, SourceDiffScope, GitCounts, gitCountsLabel, SourceFilePanel;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceDiffScope } = await server.ssrLoadModule('/src/source-diff-scope.jsx'));
  ({ GitCounts, gitCountsLabel } = await server.ssrLoadModule('/src/source-git-counts.jsx'));
  ({ SourceFilePanel } = await server.ssrLoadModule('/src/source-session.jsx'));
});
after(async () => { await server?.close(); });

test('scope trigger: ghost CDS Button named "Diff scope: main → working tree" with the two-part label', () => {
  const html = renderToStaticMarkup(React.createElement(SourceDiffScope, { trigger: diffScopeTrigger(DEFAULT_DIFF_SCOPE, { base: 'main' }), sections: [] }));
  assert.match(html, /^<button aria-label="Diff scope: main → working tree" aria-haspopup="menu" aria-expanded="false" type="button" data-cds="Button" data-variant="ghost" class="source-settings-button sds-trigger">/);
  assert.match(html, /<span class="sds-label"><span class="sds-part">main<\/span><span aria-hidden="false" data-cds="Icon" class="sds-arrow"[^>]*role="img" aria-label="to"[^>]*>.<\/span><span class="sds-part">working tree<\/span><\/span>/);
  const uncommitted = renderToStaticMarkup(React.createElement(SourceDiffScope, { trigger: diffScopeTrigger(UNCOMMITTED_DIFF_SCOPE, { base: 'main' }) }));
  assert.match(uncommitted, /aria-label="Diff scope: Uncommitted changes"/);
  assert.match(uncommitted, /<span class="sds-part">Uncommitted changes<\/span>/);
  assert.equal(renderToStaticMarkup(React.createElement(SourceDiffScope, { trigger: null })), '');
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-diff-scope.css'), 'utf8');
  assert.match(css, /\.sds-trigger\.source-settings-button\[data-cds=Button\] \{ flex-shrink: 1; min-width: 0; color: var\(--cds-text-secondary\); \}/);
  assert.match(css, /grid-template-columns: minmax\(0, max-content\) auto minmax\(0, max-content\)/);
});

test('GitCounts (shared-21 OV): sr-only unit list, aria-hidden +/− pair, first render at the target value', () => {
  assert.equal(gitCountsLabel(3, 1), '3 additions, 1 deletion');
  assert.equal(gitCountsLabel(1, 0), '1 addition, 0 deletions');
  assert.equal(gitCountsLabel(1200, 2), '1,200 additions, 2 deletions');
  const html = renderToStaticMarkup(React.createElement(GitCounts, { added: 12, removed: 0, className: 'sgr-counts' }));
  assert.equal(html, '<span class="tabular-nums sgr-counts" data-git-counts=""><span class="sr-only">12 additions, 0 deletions</span><span aria-hidden="true" class="contents"><span class="sg-added">+12</span><span class="sg-removed">−0</span></span></span>');
  // DV: 400ms, 1-(1-t)^3, skipped under reduced motion (the OS query or data-reduce-motion via useReducedMotion).
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-git-counts.jsx'), 'utf8');
  assert.match(source, /COUNT_TWEEN_MS = 400/);
  assert.match(source, /1 - \(1 - t\) \*\* 3/);
  assert.match(source, /useReducedMotion\(\)/);
});

test('Changes pane header: the scope trigger replaces the title; without it (no base) the plain title stays', () => {
  const control = React.createElement(SourceDiffScope, { trigger: diffScopeTrigger(DEFAULT_DIFF_SCOPE, { base: 'main' }) });
  const panel = (props) => renderToStaticMarkup(React.createElement(SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'changes', diff: '', ...props }));
  const withScope = panel({ diffScope: 'branch', diffScopeControl: control });
  const header = withScope.slice(0, withScope.indexOf('</header>'));
  assert.match(header, /aria-label="Diff scope: main → working tree"/);
  assert.doesNotMatch(header, /title="Uncommitted changes"|>Uncommitted changes</);
  // The default branch scope's empty state is "No changes to show" (panes-tile-current.js:3547 uncommittedOnly).
  assert.match(withScope, /No changes to show/);
  const fallback = panel({ diffScope: 'uncommitted' });
  assert.match(fallback.slice(0, fallback.indexOf('</header>')), /Uncommitted changes/);
  assert.match(fallback, /No uncommitted changes/);
  // Other tabs never show the scope control.
  assert.doesNotMatch(panel({ tab: 'plan', diffScopeControl: control }), /Diff scope:/);
});

// A hook dispatcher (as tests/sessions-page-current.test.mjs): calls a hook outside React; setters land on the next render().
function hookFixture(hook, props) {
  let cursor = 0, result;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: (context) => context._currentValue,
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (value) => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect() { cursor++; },
    useSyncExternalStore(subscribe, getSnapshot) { cursor++; return getSnapshot(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = (next = props) => {
    props = next; cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return (result = hook(props)); } finally { internal.H = old; }
  };
  render();
  return { get result() { return result; }, render };
}

// FT-08 (diffgit-02/15): 2.42304.0 c03935b01 Cc/Ln/Rn and cb61be3a2 Ze He through the real hook.
test('useDiffScope: a scope-row Uncommitted pick is remembered per session; a clean tree shows All changes without the row', async () => {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) } });
  try {
    const { useDiffScope } = await server.ssrLoadModule('/src/source-diff-scope.jsx');
    const { notifySessionEvicted } = await server.ssrLoadModule('/src/source-files-changes-adapters.jsx');
    const KEY = 'persisted.epitaxy-diff-uncommitted-sessions';
    const stored = () => Object.keys(JSON.parse(values.get(KEY) ?? '{}'));
    const dirty = { isRepo: true, scopeBase: 'main', branch: 'feature', workingTreeDirty: true };
    const props = (sessionId, status = dirty) => ({ call: async () => ({ commits: [], total: 0 }), cwd: '/repo', sessionId, status });
    const rows = (f) => f.result.control.props.sections[0].items;
    const first = hookFixture(useDiffScope, props('s1'));
    assert.equal(first.result.kind, 'branch');
    assert.deepEqual(rows(first).map((row) => row.value), ['branch', 'uncommitted']);
    rows(first)[1].onSelect();
    first.render();
    assert.equal(first.result.kind, 'uncommitted');
    assert.equal(first.result.param, 'uncommitted');
    assert.deepEqual(stored(), ['s1'], 'persisted.epitaxy-diff-uncommitted-sessions names the session');
    // A new window (or relaunch) has no in-memory pick: the remembered one applies to s1 only.
    assert.equal(hookFixture(useDiffScope, props('s1')).result.kind, 'uncommitted');
    assert.equal(hookFixture(useDiffScope, props('s2')).result.kind, 'branch');
    // workingTreeDirty false: no Uncommitted row and All changes is shown; the memory stays for when it is dirty again.
    const clean = hookFixture(useDiffScope, props('s1', { ...dirty, workingTreeDirty: false }));
    assert.equal(clean.result.kind, 'branch');
    assert.deepEqual(rows(clean).map((row) => row.value), ['branch']);
    rows(clean)[0].onSelect();
    assert.deepEqual(stored(), ['s1'], 'All changes was already on screen: nothing is forgotten');
    // workingTreeDirty unknown: still offered (only a known clean tree drops it).
    const unknown = hookFixture(useDiffScope, props('s1', { isRepo: true, scopeBase: 'main' }));
    assert.equal(unknown.result.kind, 'uncommitted');
    // Picking All changes from the menu forgets the session.
    rows(unknown)[0].onSelect();
    unknown.render();
    assert.equal(unknown.result.kind, 'branch');
    assert.deepEqual(stored(), []);
    // A commit pick changes the pane but not the memory; deleting a session drops it from the memory.
    const second = hookFixture(useDiffScope, props('s2'));
    rows(second)[1].onSelect();
    assert.deepEqual(stored(), ['s2']);
    notifySessionEvicted('s2');
    assert.deepEqual(stored(), []);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
});
