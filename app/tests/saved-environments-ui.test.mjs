import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let server, Dialog, Menu, useSaved, View, Adapters, Checkbox, Fields;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSavedEnvironmentDialog: Dialog } = await server.ssrLoadModule('/src/source-saved-environment-dialog.jsx'));
  View = await server.ssrLoadModule('/src/generated/code-current/environment-folder-view.mjs');
  Adapters = await server.ssrLoadModule('/src/source-environment-folder-adapters.jsx');
  ({ EnvironmentCheckbox: Checkbox } = await server.ssrLoadModule('/src/generated/code-current/environment-checkbox.mjs'));
  Fields = await server.ssrLoadModule('/src/generated/code-current/environment-field-controls.mjs');
  ({ SourceSavedEnvironmentMenu: Menu } = await server.ssrLoadModule('/src/source-environment-menu.jsx'));
  ({ useSavedEnvironments: useSaved } = await server.ssrLoadModule('/src/use-saved-environments.js'));
});
after(() => server?.close());
const noop = () => {};
const tick = () => new Promise(resolve => setImmediate(resolve));
const initial = { kind: 'local', cwd: '/work/app', additionalFolders: ['/work/shared'] };
const record = { id: 'dev', name: 'Dev', target: initial, createdAt: 1, lastUsedAt: 0, settings: { worktree: true, branch: 'main' } };

function elements(tree) {
  const result = [];
  for (const node of React.Children.toArray(tree)) if (React.isValidElement(node)) { result.push(node); for (const slot of ['children', 'add', 'end', 'footer', 'trailing']) result.push(...elements(node.props[slot])); }
  return result;
}
const find = (tree, predicate) => { const found = elements(tree).find(predicate); assert.ok(found, 'Expected control exists'); return found; };
const textButton = (tree, text) => find(tree, node => node.props.children === text && node.props.onClick);

// Source-only event simulation. Execute the component and its effects with a
// deterministic hook store; no browser, pixels, or desktop application involved.
function fixture(component, props, { effects = false } = {}) {
  const cells = [], pending = []; let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const dispatcher = {
    useContext(context) { return context._currentValue; },
    useState(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: typeof value === 'function' ? value() : value }; return [cells[index].value, next => { cells[index].value = typeof next === 'function' ? next(cells[index].value) : next; }]; },
    useRef(value) { return dispatcher.useState(() => ({ current: value }))[0]; },
    useMemo(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) cells[index] = { value: fn(), deps }; return cells[index].value; },
    useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
    useId() { return dispatcher.useState(() => `test-id-${cursor}`)[0]; },
    useEffect(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) { const previous = cells[index]; cells[index] = { deps }; if (effects) pending.push(() => { previous?.cleanup?.(); cells[index].cleanup = fn(); }); } },
    useLayoutEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
    useInsertionEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
    useEffectEvent(fn) { const cell = dispatcher.useRef(null); cell.current = fn; return dispatcher.useMemo(() => (...args) => cell.current(...args), []); },
  };
  function render() {
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
    internals.H = dispatcher;
    try { tree = component(props); } finally { internals.H = previous; }
    return tree;
  }
  render();
  return { render, get tree() { return tree; }, async flush() { for (const effect of pending.splice(0)) effect(); await tick(); return render(); }, close() { for (const cell of cells) cell?.cleanup?.(); } };
}

test('current field and folder markup retains source layout and accessible name/error relationships (SSR)', () => {
  function Form({ environments = [], editing = record }) {
    const tree = Dialog({ editing, environments, call: async () => ({}), onSave: noop, onClose: noop });
    const dialog = tree.props.children[0];
    return React.createElement('section', { className: dialog.props.className }, dialog.props.children);
  }
  const html = renderToStaticMarkup(React.createElement(Form));
  assert.match(html, /data-cds="TextInput" data-size="lg"/);
  const label = html.match(/<label[^>]*for="([^"]+)"[^>]*id="([^"]+)"/);
  assert.ok(label); assert.ok(html.includes(`id="${label[1]}"`)); assert.ok(html.includes(`aria-labelledby="${label[2]}"`));
  assert.match(html, /rounded shadow-card-ring/);
  // 2.42304.0 he on the primary row: the inline branch picker (the selected branch), the Worktree box and the X.
  assert.match(html, /<span class="sr-only">Branch for app:<\/span>/); assert.match(html, /aria-haspopup="menu" aria-expanded="false"/);
  assert.match(html, /data-cds-part="menu-caret"/); assert.match(html, /role="checkbox"[^>]*aria-checked="true"[^>]*aria-label="Worktree for app"|aria-label="Worktree for app"[^>]*role="checkbox"[^>]*aria-checked="true"/);
  assert.match(html, /data-cds="Checkbox"/); assert.match(html, />Worktree<\/span>/); assert.match(html, /aria-label="Remove app"/); assert.match(html, /aria-label="Remove shared"/);
  assert.match(html, /group\/place flex min-w-0/); assert.doesNotMatch(html, /More options|DotsVertical/);
  assert.match(html, /Environment variables apply to every local session/);
  assert.match(html, /footer data-align="between" class="sdlg-footer mt-0"/);
  assert.doesNotMatch(html, /Permission mode|icon picker/);
  assert.match(html, /placeholder="My app"/);
  const duplicate = renderToStaticMarkup(React.createElement(Form, { environments: [record, { ...record, id: 'other' }] }));
  assert.match(duplicate, /Another environment has this name/); assert.match(duplicate, /aria-invalid="true"/);
  assert.match(duplicate, /disabled="" type="submit"/);
});

test('editing a name, dirty dismissal, Keep editing and Save use the real dialog handlers', async () => {
  let closed = 0; const saved = [];
  const f = fixture(Dialog, { editing: record, environments: [record], call: async () => ({}), onSave: async value => saved.push(value), onClose: () => closed++ });
  find(f.tree, node => node.props.placeholder === 'My app').props.onChange({ target: { value: 'Release' } });
  f.render();
  find(f.tree, node => node.props.title === 'Edit environment').props.onClose(); f.render();
  assert.ok(elements(f.tree).some(node => node.props.title === 'Save changes?')); assert.equal(closed, 0);
  textButton(f.tree, 'Keep editing').props.onClick(); f.render();
  assert.ok(!elements(f.tree).some(node => node.props.title === 'Save changes?'));
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.deepEqual(saved, [{ name: 'Release', target: initial, settings: record.settings }]); assert.equal(closed, 1);
});

test('failed saves retain the draft and display the host error; duplicate names cannot submit', async () => {
  let saved = 0, closed = 0;
  const f = fixture(Dialog, { editing: record, environments: [record, { ...record, id: 'other', name: 'Release' }], call: async () => ({}), onSave: async () => { saved++; throw new Error('disk full'); }, onClose: () => closed++ });
  find(f.tree, node => node.props.placeholder === 'My app').props.onChange({ target: { value: ' release ' } }); f.render();
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick(); assert.equal(saved, 0);
  find(f.tree, node => node.props.placeholder === 'My app').props.onChange({ target: { value: 'Valid' } }); f.render();
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick(); f.render();
  assert.equal(saved, 1); assert.equal(closed, 0); assert.ok(elements(f.tree).some(node => node.props.role === 'alert' && node.props.children === 'disk full'));
  assert.equal(find(f.tree, node => node.props.placeholder === 'My app').props.value, 'Valid');
});

test('native folder selection can initialize an empty environment; removing primary promotes the additional folder', async () => {
  const calls = [], saved = [];
  const f = fixture(Dialog, { initialTarget: { kind: 'local', cwd: '' }, onClose: noop, onSave: async value => saved.push(value), call: async (action, params) => { calls.push([action, params]); return '/work/app'; } });
  // cd8823d73 ge "+ Add" (R3-home): the Select's footer FooterAction "Choose…" closes it and opens the native picker.
  const add = find(f.tree, node => node.props['aria-label'] === 'Add' && node.props.footer);
  const closes = [];
  const action = add.props.footer({ close: () => closes.push('close') });
  assert.equal(action.props['aria-label'], 'Choose a folder'); assert.equal(action.props.icon, 'Folder');
  action.props.onClick(); await tick(); f.render();
  assert.deepEqual(closes, ['close']);
  assert.deepEqual(calls, [['folder', { additional: true }]]);
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.deepEqual(saved[0].target, { kind: 'local', cwd: '/work/app' }); assert.equal(saved[0].name, 'app');
  const edit = fixture(Dialog, { editing: record, call: async () => ({}), onClose: noop, onSave: async value => saved.push(value) });
  find(edit.tree, node => node.props.label === 'app' && node.props.onRemove).props.onRemove(); edit.render();
  assert.ok(elements(edit.tree).some(node => node.props.label === 'shared' && node.props.onRemove), 'the promoted folder is now the primary row');
  assert.ok(!elements(edit.tree).some(node => node.props.label === 'app' && node.props.onRemove));
  find(edit.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.deepEqual(saved[1].target, { kind: 'local', cwd: '/work/shared' }); assert.equal(saved[1].settings.branch, 'main', 'the source retains primary settings with additionalFolderCheckouts off');
});

test('delete requires the source confirmation and keeps the form on failure', async () => {
  let deletes = 0;
  const f = fixture(Dialog, { editing: record, call: async () => ({}), onClose: noop, onDelete: async id => { assert.equal(id, record.id); deletes++; throw new Error('cannot delete'); } });
  textButton(f.tree, 'Delete environment').props.onClick(); f.render(); assert.equal(deletes, 0);
  const confirm = find(f.tree, node => node.props.title === 'Delete environment?');
  assert.match(confirm.props.body, /Sessions started from it are kept/);
  await confirm.props.onConfirm(); f.render(); assert.equal(deletes, 1);
  assert.ok(elements(f.tree).some(node => node.props.children === 'cannot delete'));
});

test('named environment search and edit/star actions never select a different environment', () => {
  const selected = [], edited = [], starred = [];
  const f = fixture(Menu, { popup: { label: 'Choose environment', onClose: noop }, environments: [record, { ...record, id: 'prod', name: 'Production' }], selectedId: 'dev', starred: ['preset:dev'], onSelect: id => selected.push(id), onEdit: id => edited.push(id), onStar: id => starred.push(id), onCreate: noop });
  // R3-home: the picker is its own SearchablePopup (search field in the header); its rows get the lowercased query.
  // p0 fills its order during the first render (React re-renders the component at once; this dispatcher on the next call).
  const popup = find(f.render(), node => node.props.searchLabel === 'Search environments…');
  const rows = fixture(popup.props.children('product').type, popup.props.children('product').props).tree;
  // The query lists A0's rows for the local kind: render A0 to reach its k0 rows.
  const a0 = find(rows, node => node.props.kind === 'local' && node.props.query === 'product');
  const k0 = elements(a0.type(a0.props)).filter(node => node.props.item);
  assert.equal(k0.length, 1); assert.equal(k0[0].props.item.name, 'Production');
  const row = fixture(k0[0].type, k0[0].props).tree;
  assert.equal(row.props['data-testid'], 'env-picker-environment');
  row.props.onKeyDown({ key: 'ArrowRight', preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(edited, ['prod']); assert.deepEqual(selected, []);
  const actions = elements(row.props.trailing);
  actions.find(node => node.props.onToggle).props.onToggle(); assert.deepEqual(starred, ['prod']); assert.deepEqual(selected, []);
  row.props.onClick(); assert.deepEqual(selected, ['prod']);
});

test('late initial load cannot overwrite a newer broadcast from another window', async () => {
  let resolveList, receive, off = 0;
  const api = { onEvent: fn => { receive = fn; return () => off++; } };
  const call = () => new Promise(resolve => { resolveList = resolve; });
  const Hook = () => useSaved(call, api);
  const f = fixture(Hook, {}, { effects: true }); await f.flush();
  const next = { environments: [record], starred: ['preset:dev'], selectedId: 'dev' };
  receive({ kind: 'saved-environments', snapshot: next });
  resolveList({ environments: [], starred: [], selectedId: null }); await tick();
  assert.equal(f.render().selectedId, 'dev'); assert.equal(f.tree.environments[0].id, 'dev');
  f.close(); assert.equal(off, 1);
});

test('an older action response cannot roll back a later cross-window selection', async () => {
  let receive, reply;
  const api = { onEvent: fn => { receive = fn; return noop; } };
  const call = (_action, request) => request.op === 'list' ? Promise.resolve({ environments: [], starred: [], revision: 0 }) : new Promise(resolve => { reply = resolve; });
  const f = fixture(() => useSaved(call, api), {}, { effects: true }); await f.flush();
  const pending = f.tree.run({ op: 'select', id: 'dev' });
  receive({ kind: 'saved-environments', snapshot: { environments: [record], selectedId: 'other', revision: 2, selectionRevision: 2 } });
  reply({ snapshot: { environments: [record], selectedId: 'dev', revision: 1, selectionRevision: 1 }, environment: record }); await pending;
  assert.equal(f.render().selectedId, 'other'); assert.equal(f.tree.revision, 2); f.close();
});

const controlsOf = (tree, label) => find(tree, node => node.props.label === label && node.props.onRemove);
const repoCall = info => async (action, params) => action === 'workspace-info' ? { ...info } : (() => { throw Error(`${action} ${JSON.stringify(params)}`); })();

test('ca690a791 fn: a folder outside a repository shows the note instead of branch and Worktree controls', async () => {
  const f = fixture(Dialog, { editing: { ...record, settings: {} }, call: repoCall({ isRepo: false, branch: '', branches: [] }), onSave: noop, onClose: noop }, { effects: true });
  await f.flush();
  const controls = controlsOf(f.tree, 'app');
  assert.equal(controls.props.note, 'Not a Git repository');
  assert.equal(controls.props.branch, undefined); assert.equal(controls.props.worktree, undefined);
  const html = renderToStaticMarkup(controls);
  assert.match(html, /data-cds="OverflowTooltip" class="block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">Not a Git repository<\/span>/);
  assert.match(html, /data-place-first=""[^>]*aria-label="Remove app"|aria-label="Remove app"[^>]*data-place-first=""/, 'the X is the row\'s first stop');
  assert.doesNotMatch(html, /role="checkbox"|aria-haspopup/);
  f.close();
});

test('ca690a791 fn: a repository row picks from its branches; Worktree keeps the branch, the empty pick clears it', async () => {
  const saved = [];
  const f = fixture(Dialog, { editing: record, environments: [record], onClose: noop, onSave: async value => saved.push(value),
    call: repoCall({ isRepo: true, branch: 'feature', branches: ['feature', 'trunk', 'main'], originHead: 'origin/trunk' }) }, { effects: true });
  await f.flush();
  let { branch, worktree } = controlsOf(f.tree, 'app').props;
  assert.deepEqual({ value: branch.value, pick: branch.pick, none: branch.none, branches: branch.branches, typed: branch.typed },
    { value: 'main', pick: 'starts-worktree', none: { branch: 'trunk', mark: 'default' }, branches: ['main', 'feature', 'trunk'], typed: false });
  assert.deepEqual([branch.searchLabel, branch.emptyMessage, worktree.checked], ['Search branches…', 'No branches', true]);
  worktree.onChange(false); f.render();
  ({ branch } = controlsOf(f.tree, 'app').props);
  assert.deepEqual([branch.pick, branch.none], ['switches-folder', { branch: 'feature', mark: 'current' }], 'unchecked: the folder switches from its checkout');
  branch.onChange(''); f.render();
  find(f.tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.deepEqual(saved[0].settings, { worktree: false, branch: undefined });
  f.close();
});

test('cd8823d73 pe: an exact branch first, the default or current choice, then matches; nothing is invented', () => {
  const pick = { value: 'main', branches: ['release-candidate', 'release', 'main'], none: { branch: 'main', mark: 'default' }, typed: false };
  assert.deepEqual(View.environmentBranchOptions(pick, '', 'Default'), [{ value: '', checked: true }, { value: 'release-candidate', checked: false }, { value: 'release', checked: false }]);
  assert.deepEqual(View.environmentBranchOptions(pick, 'release', 'Default'), [{ value: 'release', checked: false }, { value: 'release-candidate', checked: false }]);
  assert.deepEqual(View.environmentBranchOptions(pick, 'default', 'Default'), [{ value: '', checked: true }], 'the hint word finds the default row');
  assert.deepEqual(View.environmentBranchOptions(pick, 'brand-new', 'Default'), []);
  const current = { value: 'feature', branches: ['feature', 'main'], none: { branch: 'feature', mark: 'current' }, typed: false };
  assert.deepEqual(View.environmentBranchOptions(current, '', 'Current'), [{ value: '', checked: false }, { value: 'feature', checked: true }, { value: 'main', checked: false }]);
  assert.equal(View.environmentBranchTyped({ ...pick, typed: true }, 'new'), true); assert.equal(View.environmentBranchTyped(pick, 'new'), false);
  assert.equal(View.environmentPlaceFirstAttribute, 'data-place-first');
});

test('cd8823d73 he: submitting a search picks its first option; the box and X report through flushSync and refocus the next row', () => {
  const picked = [], boxes = [], removed = [];
  const props = { label: 'app', onRemove: () => removed.push('app'), worktree: { checked: true, onChange: value => boxes.push(value) },
    branch: { value: 'main', pick: 'starts-worktree', none: { branch: 'main', mark: 'default' }, branches: ['main', 'release'], typed: false,
      searchLabel: 'Search branches…', emptyMessage: 'No branches', onChange: value => picked.push(value) } };
  const f = fixture(View.EnvironmentFolderControls, props);
  const root = find(f.tree, node => node.props.onOpenChange && 'open' in node.props);
  assert.equal(root.props.open, false); assert.equal(root.props.modal, false);
  root.props.onOpenChange(true, { reason: 'trigger-press' }); f.render();
  const popup = find(f.tree, node => node.props.onSubmitQuery);
  assert.deepEqual([popup.props.side, popup.props.align, popup.props.className, popup.props.searchLabel], ['bottom', 'end', 'w-max min-w-64 max-w-96', 'Search branches…']);
  popup.props.onSubmitQuery('rel'); assert.deepEqual(picked, ['release']);
  const rows = popup.props.children('', '');
  assert.equal(rows.type, Adapters.EnvironmentMenu.Group);
  const [label, options] = rows.props.children;
  assert.equal(label.type, Adapters.EnvironmentMenu.GroupLabel); assert.equal(label.props.children.props.defaultMessage, 'Start worktree from');
  assert.deepEqual(options.map(option => [option.key, option.props.checked, option.props.hint]), [['', true, 'Default'], ['release', false, undefined]]);
  const switching = fixture(View.EnvironmentFolderControls, { ...props, branch: { ...props.branch, pick: 'switches-folder', none: { branch: 'feature', mark: 'current' }, branches: ['feature', 'main'] } });
  find(switching.tree, node => node.props.onOpenChange && 'open' in node.props).props.onOpenChange(true, { reason: 'trigger-press' }); switching.render();
  const switched = find(switching.tree, node => node.props.onSubmitQuery).props.children('', '');
  assert.equal(switched.props.children[2].props.children.props.defaultMessage, 'Switch this folder to', 'the current branch row, a separator, then the header');
  find(f.tree, node => node.props.onCheckedChange).props.onCheckedChange(false); assert.deepEqual(boxes, [false]);
  // X: the row is removed (flushSync), then focus lands on the row now at the same index.
  const focused = [];
  const next = { querySelector: selector => selector === '[data-place-first]' ? { focus: () => focused.push('next') } : null };
  const list = { isConnected: true, children: [] };
  const row = { parentElement: list, closest: selector => (selector === 'li' ? row : null) };
  list.children = [row, next];
  const remove = find(f.tree, node => node.props['aria-label'] === 'Remove app');
  props.onRemove = () => { removed.push('app'); list.children = [next]; };
  const g = fixture(View.EnvironmentFolderControls, props);
  find(g.tree, node => node.props['aria-label'] === 'Remove app').props.onClick({ currentTarget: { closest: selector => (selector === 'li' ? row : null) } });
  assert.deepEqual(removed, ['app']); assert.deepEqual(focused, ['next']);
  assert.match(remove.props.className, /opacity-0 group-focus-within\/place:opacity-100 group-hover\/place:opacity-100/);
});

test('host overlays: the menu trigger is the CDS Button with its caret; the Checkbox is the CDS wA over a Base UI root', () => {
  const trigger = renderToStaticMarkup(React.createElement(Adapters.EnvironmentMenu.Root, { open: false },
    React.createElement(Adapters.EnvironmentMenu.TriggerButton, { variant: 'ghost', size: 'xs', className: 'min-w-0 shrink text-muted-as-secondary' }, 'main')));
  assert.match(trigger, /^<button type="button" data-cds="Button" data-cds-ghost="" data-size="xs" class="[^"]*min-w-0 shrink text-muted-as-secondary"[^>]*aria-haspopup="menu" aria-expanded="false"/);
  assert.match(trigger, /class="shrink-0 opacity-60" data-cds-part="menu-caret"/);
  const box = renderToStaticMarkup(React.createElement(Checkbox, { size: 'xxs', checked: true, 'aria-label': 'Worktree for app', label: 'Worktree', onCheckedChange: noop }));
  assert.match(box, /^<span[^>]*role="checkbox" tabindex="0" aria-checked="true"[^>]*data-checked=""/);
  assert.match(box, /data-cds="Checkbox"/); assert.match(box, /data-size="xxs"/);
  assert.match(box, /class="cds-reset group\/cb [^"]*inline-flex gap-xs text-start[^"]*\[--cds-checkbox:var\(--cds-checkbox-xxs\)\]/);
  assert.match(box, /size-\[var\(--cds-checkbox\)\][^"]*group-data-\[checked\]\/cb:bg-fill-accent/);
  assert.match(box, /<input type="checkbox"[^>]*aria-hidden="true" tabindex="-1"/);
  const disabled = renderToStaticMarkup(React.createElement(Checkbox, { size: 'xxs', checked: false, disabled: true, disabledReason: 'Shared', label: 'Worktree', onCheckedChange: noop }));
  assert.match(disabled, /aria-disabled="true"[^>]*data-unchecked=""[^>]*data-disabled=""|data-unchecked=""[^>]*data-disabled=""/);
  assert.match(disabled, /data-cds-disabled-reason="">Shared<\/span>/);
});

test('2.42304.0 field controls: logical end padding beside a clear button, wrapping errors (SSR)', () => {
  const input = renderToStaticMarkup(React.createElement(Fields.EnvironmentTextInput, { clearable: true, value: 'x', onChange: noop, 'aria-label': 'Name' }));
  assert.match(input, /ps-md/); assert.match(input, /pe-\[calc\(\(var\(--cds-h-control\)-var\(--cds-h-control-nested\)\)\/2\)\]/);
  assert.doesNotMatch(input, /\bp[lr]-(md|\[calc)/);
  assert.match(input, /text-\[color:var\(--cds-text-stays-secondary,var\(--cds-text-muted\)\)\]/);
  const plain = renderToStaticMarkup(React.createElement(Fields.EnvironmentTextInput, { value: 'x', onChange: noop, 'aria-label': 'Name' }));
  assert.match(plain, /ps-md[^"]*pe-md|pe-md[^"]*ps-md/);
  const error = renderToStaticMarkup(React.createElement(Fields.EnvironmentFieldError, { match: true }, 'Taken'));
  assert.match(error, /class="[^"]*wrap-break-word[^"]*"/);
  const field = renderToStaticMarkup(React.createElement(Fields.EnvironmentField, { className: 'gap-sm' }, React.createElement(Fields.EnvironmentLabel, null, 'Name')));
  assert.match(field, /class="flex flex-col font-sans gap-sm"/, 'the CDS twMerge joiner drops the default gap-xs');
});

test('host SearchablePopup: raised over the dialog, Base UI close reasons, Tab reaches he, the field submits and enters the rows', () => {
  const closes = [], queries = [], submitted = [], consumer = [];
  const menu = { open: true, triggerRef: { current: null }, popupId: 'menu-id', setOpen: (open, reason) => closes.push([open, reason]) };
  const f = fixture(Adapters.SearchablePopupOpen, { menu, side: 'bottom', align: 'end', className: 'w-max min-w-64 max-w-96', searchLabel: 'Search branches…',
    onQueryChange: value => queries.push(value), onSubmitQuery: value => submitted.push(value), onKeyDown: event => consumer.push([event.key, typeof event.preventBaseUIHandler]),
    children: (lower, text) => React.createElement('div', { 'data-query': `${lower}|${text}` }) });
  const popup = f.tree;
  assert.deepEqual([popup.props.layerBase, popup.props.id, popup.props.initialHighlight, popup.props.className], [140, 'menu-id', null, 'saved-environment-branch-popup w-max min-w-64 max-w-96']);
  popup.props.onClose('item-click'); popup.props.onClose('escape-key'); assert.deepEqual(closes, [[false, 'item-press'], [false, 'escape-key']]);
  // R3-home: yC's search field is the popup's header (SourceMenu.Popup header); the rows are its children.
  const field = popup.props.header, rows = popup.props.children;
  assert.equal(field.type, Adapters.SearchField);
  field.props.onChange('  Rel '); f.render();
  assert.deepEqual(queries, ['  Rel ']); assert.equal(f.tree.props.children.props['data-query'], 'rel|Rel');
  // A Tab from the field propagates to the consumer (he commits and closes) with a preventBaseUIHandler to call.
  f.tree.props.onKeyDown({ key: 'Tab', target: { closest: () => ({}) }, nativeEvent: {} });
  assert.deepEqual(consumer, [['Tab', 'function']]);
  assert.equal(rows.props['data-query'], '|');
  // The field: Enter submits the trimmed query; ArrowDown lands on the first enabled row; other keys stay in the field.
  const s = fixture(Adapters.SearchField, { inputRef: { current: null }, query: ' release ', searchLabel: 'Search branches…', onChange: noop, onSubmitQuery: value => submitted.push(value) });
  const input = s.tree.props.children[0];
  assert.deepEqual([input.props.placeholder, input.props['aria-label'], input.props.className], ['Search branches…', 'Search branches…', '!border-transparent !bg-transparent !shadow-none compact:!ps-2 comfortable:!ps-2.5']);
  const key = (name, extra = {}) => { const log = []; input.props.onKeyDown({ key: name, nativeEvent: {}, repeat: false, shiftKey: false, altKey: false, preventDefault: () => log.push('prevent'), stopPropagation: () => log.push('stop'), ...extra }); return log; };
  assert.deepEqual(key('Enter'), ['prevent', 'stop']); assert.deepEqual(submitted, ['release']);
  const focused = [];
  const row = { focus: () => focused.push('row') };
  assert.deepEqual(key('ArrowDown', { currentTarget: { closest: () => ({ querySelectorAll: () => [row] }) } }), ['prevent', 'stop']); assert.deepEqual(focused, ['row']);
  assert.deepEqual(key('a'), ['stop']); assert.deepEqual(key('Tab'), []); assert.deepEqual(key('Escape'), []);
});

test('host Base UI checkbox root: click and Space toggle through onCheckedChange; Enter submits the form', () => {
  const changes = [], clicks = [];
  const f = fixture(props => Adapters.EnvironmentCheckboxRoot.render(props, null), { checked: true, onCheckedChange: (value, details) => changes.push([value, details.reason]), children: 'Worktree' });
  const [root, input] = f.tree.props.children;
  assert.deepEqual([root.props.role, root.props['aria-checked'], root.props['data-checked'], root.props.tabIndex], ['checkbox', true, '', 0]);
  assert.deepEqual([input.props.type, input.props['aria-hidden'], input.props.tabIndex, input.props.checked], ['checkbox', 'true', -1, true]);
  const event = (key, extra = {}) => ({ key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, nativeEvent: {}, ...extra });
  root.props.onClick(event()); root.props.onKeyUp(event(' ')); assert.deepEqual(changes, [[false, 'none'], [false, 'none']]);
  const submit = { tagName: 'BUTTON', type: 'submit', disabled: false, click: () => clicks.push('submit') };
  root.props.onKeyDown(event('Enter', { currentTarget: { closest: () => ({ elements: [{ tagName: 'INPUT', type: 'text' }, submit] }) } }));
  assert.deepEqual(clicks, ['submit']);
  const off = fixture(props => Adapters.EnvironmentCheckboxRoot.render(props, null), { checked: false, disabled: true, onCheckedChange: () => changes.push('no') });
  const [disabled] = off.tree.props.children;
  assert.deepEqual([disabled.props['data-unchecked'], disabled.props['data-disabled'], disabled.props['aria-disabled'], disabled.props.tabIndex], ['', '', true, -1]);
  disabled.props.onClick(event()); assert.equal(changes.length, 2);
});
