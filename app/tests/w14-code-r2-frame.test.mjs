// W14-code round 2, lane "frame": each case pins the 3.6556.2 source it follows, then checks the host.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { nestedSessionFamily, nestedFamilyAsks } from '../src/sidebar-bulk-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const chunk = (prefix) => {
  const dir = path.join(snapshot, 'assets/v1');
  const name = fs.readdirSync(dir).find((file) => file.startsWith(prefix + '-') && file.endsWith('.js'));
  return fs.readFileSync(path.join(dir, name), 'utf8');
};
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(snapshot, 'i18n/en-US.json'), 'utf8'));

let server, load;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());

const btw = (parent, extra = {}) => ({ spawnedFrom: { sideSession: true, btw: true, userFork: true, sessionId: parent, ...extra } });

test('fr2-01 model: c48ea26ad F / Y over the local side-session lineage', () => {
  const official = chunk('c48ea26ad');
  for (const feature of ['nested:s,detachable:l,boundCount:d.size', 'asks:t==="archive"&&!k().has(e.id)?n.nested.length>n.boundCount:n.detachable.length>0'])
    assert.ok(official.includes(feature), feature);
  const sessions = [{ id: 'p' }, { id: 'c1' }, { id: 'c2' }, { id: 'g' }, { id: 'old', archived: true }];
  const metadata = { c1: btw('p'), c2: btw('p', { sharedCheckout: true }), g: btw('c1'), old: btw('p') };
  const archive = nestedSessionFamily('p', 'archive', { sessions, metadata, isWorking: (id) => id === 'g' });
  assert.deepEqual(archive, { nested: ['g', 'c1', 'c2'], detachable: ['c1'], boundCount: 1, canStay: ['g', 'c1'], workingCount: 1 });
  assert.equal(nestedFamilyAsks(archive, 'archive'), true);
  // A delete counts archived members too; a family made only of a shared checkout never asks an archive.
  assert.deepEqual(nestedSessionFamily('p', 'delete', { sessions, metadata }).nested, ['g', 'c1', 'c2', 'old']);
  const bound = nestedSessionFamily('p', 'archive', { sessions: [{ id: 'p' }, { id: 'c2' }], metadata });
  assert.equal(nestedFamilyAsks(bound, 'archive'), false);
  // Detached children are no longer family.
  assert.deepEqual(nestedSessionFamily('p', 'archive', { sessions, metadata: { ...metadata, c1: { ...btw('p'), lineageDetached: true } } }).nested, ['c2']);
});

test('fr2-01 dialog: shared-20 IA / BA copy and the ca674e66a footer', async () => {
  const shared20 = chunk('shared-20'), body = chunk('ca674e66a');
  assert.ok(shared20.includes('Archive only this one and {count, plural, one {it moves} other {they move}} to the top level.'));
  assert.ok(shared20.includes('defaultMessage:"Archive session?",id:"VVLPKXdICd"'));
  assert.ok(body.includes('"{count, plural, =2 {Archive # sessions} one {Archive all # sessions} other {Archive all # sessions}}"'));
  const M = await load('/src/source-nested-sessions-confirm.jsx');
  assert.equal(M.nestedSessionsDescription({ action: 'archive', sessionTitle: 'Fix', nestedCount: 2, boundCount: 1, workingCount: 1 }),
    '“Fix” has 2 nested sessions. Archive only this one and they move to the top level. One of them depends on this session’s checkout and can’t stay on its own. A nested session is still working and stops if you archive it too.');
  assert.equal(M.nestedSessionsDescription({ action: 'delete', nestedCount: 1, workingCount: 3 }),
    'This session has a nested session. Delete only this one and it moves to the top level. This can’t be undone.');
  const main = local('src/main.jsx');
  // 复核修复: X confirms (K) before anything moves; the gate hands "only" / "all" on as proceed() run after the confirm.
  assert.ok(main.includes('const nested = action === "archive" ? await nestedSessionsGate(action, target, payload) : "go";'));
  assert.ok(main.includes('const nested = await nestedSessionsGate(action, target, payload);'));
  assert.match(main, /useEffect\(\(\) => connectNestedFamilies\(\{/);
  assert.match(main, /\{side === 0 && <SourceNestedSessionsConfirm \/>\}/);
});

test('fr2-01 复核: c48ea26ad X asks first, confirms (K), and only then moves the nested sessions', async () => {
  const official = chunk('c48ea26ad');
  for (const feature of ['let p=()=>F(e.id,{action:i}).detachable.map(We);if(i==="archive"&&p().length===0)return{...U(e),asked:!0};let m=await K(e.id,i,t);if(!m)return null;let h=p();',
    'o=await x(e,"delete",{ownerWindow:n,', 'a=await x(e,"archive",{ownerWindow:n,probe:i})'])
    assert.ok(official.includes(feature), feature);
  const main = local('src/main.jsx');
  // A single delete: the nested question, then the "Delete session?" confirm, whose Delete hands the answer on.
  const request = main.slice(main.indexOf('async function requestSessionDelete(target) {'));
  assert.ok(request.indexOf('await askNestedFamily("delete", target)') < request.indexOf('setConfirmDelete(target);'));
  assert.equal((main.match(/setConfirmDelete\((?!null)/g) || []).length, 1, 'every delete entry goes through requestSessionDelete');
  assert.match(main, /nestedAnswer: deleteNestedAnswer\.current\.answer/);
  // An archive: the worktree confirm comes before the move.
  const archive = main.slice(main.indexOf('const nested = action === "archive" ? await nestedSessionsGate'));
  // W14-code r5 fr5-05: the archive's gate is archiveWorktreeGate (c6b8adeaf: a dirty read already in asks, else late).
  assert.ok(archive.indexOf('await archiveWorktreeGate(target, payload, worktreeGateHost)') > 0);
  assert.ok(archive.indexOf('await archiveWorktreeGate(target, payload, worktreeGateHost)') < archive.indexOf('await nested() === false'));
  // worktreeGatedAction's prepare runs after the confirm and before perform; a cancel or a failed prepare stops it.
  const { worktreeGatedAction } = await import('../src/sidebar-bulk-model.mjs');
  const steps = [];
  const call = async (channel) => (channel === 'worktree-status' ? { worktree: '/w', changes: 2 } : steps.push(channel));
  const run = (answer, prepared) => worktreeGatedAction('delete', { id: 's' }, {}, { call, now: () => 1,
    enqueue: async () => { steps.push('confirm'); return answer; }, prepare: async () => { steps.push('prepare'); return prepared; },
    perform: async () => { steps.push('perform'); } });
  assert.equal(await run(false, true), false);
  assert.deepEqual(steps.splice(0), ['confirm'], 'cancelled confirm: nothing moved');
  assert.equal(await run(true, false), false);
  assert.deepEqual(steps.splice(0), ['confirm', 'prepare'], 'failed move: no delete');
  assert.equal(await run(true, true), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(steps.splice(0), ['confirm', 'prepare', 'perform', 'worktree-remove']);
});

test('fr2-02 复核: Discard drops the stored draft and the pending write before the side closes', () => {
  const main = local('src/main.jsx');
  const read = main.slice(main.indexOf('splitDraftRead.current = () =>'), main.indexOf('useEffect(() => registerSplitDraft(side'));
  assert.match(read, /discard: \(\) => \{\s*pendingDraftWrite\.current = null;\s*forgetDraft\(browserStorage\(\), homeDraftKey\);\s*setDraft\(""\)/);
});

test('fr2-02: shared-16 W_ / G_ Discard draft? and closeSplitSide', async () => {
  const shared16 = chunk('shared-16');
  for (const feature of ['defaultMessage:"Discard draft?",id:"XTHxOYpOlm"', 'defaultMessage:"Keep editing",id:"nZCHBxEAlK"', 'return t.length>60?`${t.slice(0,60)}\\u2026`:t'])
    assert.ok(shared16.includes(feature), feature);
  const D = await load('/src/source-discard-draft.jsx');
  assert.equal(D.draftPreview('  a\n\n b '), 'a b');
  assert.equal(D.draftPreview('x'.repeat(70)), 'x'.repeat(60) + '…');
  assert.equal(D.discardDraftDescription({ preview: 'hi', noun: 'session' }), '“hi” hasn’t been sent. Start a session from it, or discard it?');
  const closed = [];
  assert.equal(await D.closeSplitSide(7, (index) => closed.push(index)), true, 'no draft: closes at once');
  let started = 0, discarded = 0;
  const off = D.registerSplitDraft(8, () => ({ text: 'draft', start: () => { started += 1; }, discard: () => { discarded += 1; } }));
  const asking = D.closeSplitSide(8, (index) => closed.push(index));
  const second = D.askDiscardDraft('newer');
  assert.equal(await asking, false, 'a newer request settles the open one with cancel');
  assert.deepEqual(closed, [7]);
  off();
  void second;
  const main = local('src/main.jsx');
  assert.equal((main.match(/closeSplitSide\(/g) || []).length, 4);
  assert.ok(main.includes('useEffect(() => registerSplitDraft(side, () => splitDraftRead.current?.() ?? null), [side]);'));
  assert.equal(started + discarded, 0);
});

test('css2-archived-note: c9543da06 yu stands in for an archived Code session’s composer', async () => {
  const yu = chunk('c9543da06');
  assert.ok(yu.includes('defaultMessage:"This session is archived. Unarchive it to keep working in this session.",id:"2Xfm7IN5gs"'));
  assert.ok(chunk('shared-6').includes('x_="flex items-center gap-[5px] w-full min-h-[40px] p-[8px] rounded-[10px]"'));
  const B = await load('/src/source-archived-banner.jsx');
  const html = renderToStaticMarkup(React.createElement(B.SourceArchivedBanner, { onUnarchive() {} }));
  assert.match(html, /^<div role="note" data-composer-stand-in="" class="[^"]*min-h-\[40px\][^"]*bg-alpha-1[^"]*epitaxy-band-enter">/);
  assert.match(html, /<span class="text-primary">This session is archived\. Unarchive it to keep working in this session\.<\/span>/);
  assert.match(html, /<span class="flex h-\[1lh\] shrink-0 items-center"><button type="button" data-cds="Button"[^>]*>.*Unarchive/);
  const main = local('src/main.jsx');
  assert.ok(main.includes(`{mode === 'chat' && session?.archived && <div className="archive-notice">`));
  assert.ok(main.includes('<SourceArchivedBanner key={`${current}:archived`}'));
});

test('fr2-05: the sidebar body is shared-22 GI’s class; the tray and padding stand-ins are gone', () => {
  assert.ok(chunk('shared-22').includes('"dframe-sidebar-body flex flex-col flex-1 min-h-0 gap-2 px-2 pt-3 pb-1.5 [overflow:clip]"'));
  const sidebar = local('src/source-sidebar.jsx');
  assert.ok(sidebar.includes('const SIDEBAR_BODY_CLASS = "dframe-sidebar-body flex flex-col flex-1 min-h-0 gap-2 px-2 pt-3 pb-1.5 [overflow:clip]";'));
  assert.doesNotMatch(local('src/style.css'), /\n\.dframe-sidebar-body \{|\.source-sidebar \.df-bottom-tray \{/);
  assert.doesNotMatch(local('src/source-sidebar.css'), /\.source-sidebar \.dframe-sidebar-body/);
});

test('fr2-06: no host "Command palette" / "Saving session name" names', () => {
  const catalog = JSON.stringify(enUS);
  assert.ok(catalog.includes('"Command palette options"'));
  assert.ok(!catalog.includes('"Command palette"') && !catalog.includes('"Saving session name"'));
  assert.doesNotMatch(local('src/source-sidebar-palette.jsx'), /t\("Command palette"\)/);
  assert.doesNotMatch(local('src/source-titlebar.jsx'), /Saving session name/);
});

test('fr2-19: pane trailing controls are CDS ghost iconOnly Buttons; Close is "Close"', async () => {
  const official = chunk('c4db265df');
  assert.ok(official.includes('defaultMessage:"Close",id:"rbrahOGMC3"'));
  assert.ok(official.includes('"hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover"'));
  const C = await load('/src/source-pane-controls.jsx');
  const html = renderToStaticMarkup(React.createElement(C.SourcePaneControls, { tileId: 't', paneName: 'Files', onClose() {}, onToggleExpand() {} }));
  assert.match(html, /data-cds-ghost="" class="[^"]* shrink-0 epitaxy-pane-close-control" aria-label="Close"/);
  assert.doesNotMatch(html, /spc-ghost|source-icon-button/);
  assert.doesNotMatch(local('src/source-pane-controls.css'), /\n\.spc-(row|group|open-window)/);
});

test('fr2-21 / fr2-22 / fr2-18: folder pill, section "+", What’s new use the official strings', () => {
  assert.ok(chunk('c73f45bc3').includes('Pv=Mv(jv(Tv,"text-secondary-control"))'));
  assert.match(local('src/generated/code-current/titlebar-folder-pill.mjs'), /var Pv = Mv\(jv\(Tv, "text-secondary-control"\)\);/);
  assert.match(local('src/generated/code-current/sidebar-row-control.mjs'), /"data-row-action": ""/);
  // W14-code r4 sidebar-aria-names: shared-21 V7.newSessionIn is "New session in {group}" (`{ group: t }`), so the host key
  // carries the official placeholder too.
  assert.ok(local('src/source-sidebar.jsx').includes('<span className="-my-1"><SidebarRowControl aria-label={t("New session in {group}", { group: group.label })}'));
  assert.ok(chunk('cb63ed069').includes('className:"text-caption font-medium uppercase tracking-wide text-muted-as-secondary"'));
  assert.ok(local('src/source-titlebar.jsx').includes('<h5 className="text-caption font-medium uppercase tracking-wide text-muted-as-secondary">'));
});
