import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { gitRepoMenuItems, commitAction, COMMIT_CLEAN_REASON, COMMIT_RESPONDING_REASON } from '../src/git-rail-model.mjs';

// Git band hints are CDS tooltips, never native titles (git-status-card
// 1270-1318 K, 1085-1119 Fe → shared-frame Pu 4869-4895; git-chips D/M). The
// repo menu groups follow cc70f2bdf Ko/qo 2270-2394. Node-only SSR, no window.
//
// R4f-rail SR-8: the rail is the 2.42304.0 flat session rail now (src/source-session-rail.jsx mounts it in the Code
// session page). Its Changes card is the generated c96d752d0 OLe `data-rail-changes-row` row
// (src/generated/session-rail-changes, host stand-in SessionRailChanges), so the rail tests below read that row. The
// hand-written 2.3x stacked rail (src/source-git-rail.jsx/.css, git-status-card Ii/Zi, never mounted) is retired.
let server;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

const dirty = { isRepo: true, cwd: '/work/space/repo', repoName: 'repo', branch: 'feature/a-rather-long-branch-name', hasChanges: true, workingTreeDirty: true, added: 3, removed: 1 };
const clean = { ...dirty, hasChanges: false, workingTreeDirty: false, added: 0, removed: 0 };
const noop = () => {};
// The flat rail's Changes card (cf74bc599 rD `pullRequests`, the "row" layout from the kit ChangesRowLayoutContext, D10)
// and — W14-code r7 css7-git-band-prbarrow — the composer band (c96d752d0 Sje's band branch: the same generated EL in its
// band layout, SessionBandChanges, and the stale hold SessionBandHold), rendered only inside withRail: view-tabs' preload
// helper creates a link element while it evaluates and the keybinding table reads the user agent (D21, as
// tests/session-rail-changes.test.mjs). The verb is the host's commit verb (main.jsx: sendCommitTurn + git-rail-model
// commitAction). The band's repo menu items are the host's railRepoMenuItems shape (label / onSelect / separatorBefore).
const REPO_ITEMS = [{ label: 'Show in Finder', onSelect: noop }, { label: 'Copy path', separatorBefore: true, onSelect: noop }];
let railModules;
async function withRail(fn) {
  const saved = { window: Object.getOwnPropertyDescriptor(globalThis, 'window'), document: Object.getOwnPropertyDescriptor(globalThis, 'document') };
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: undefined, matchMedia: undefined, navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } };
  try {
    railModules ??= { adapters: await server.ssrLoadModule('/src/source-session-rail-changes-adapters.jsx'),
      chip: await server.ssrLoadModule('/src/generated/session-rail-kit/branch-chip.mjs') };
    const { adapters, chip } = railModules;
    const rail = ({ verb, ...props }) => renderToStaticMarkup(React.createElement(chip.ChangesRowLayoutContext.Provider, { value: 'row' },
      React.createElement(adapters.SessionRailChanges, { diffOpenable: true, onOpenChanges: noop, onToggleChanges: noop,
        verb: verb && { mode: 'commit', onClick: noop, disabled: verb.disabled, disabledReason: verb.disabledReason }, ...props })));
    const band = ({ verb = commitAction(dirty), ...props }) => renderToStaticMarkup(React.createElement(adapters.SessionBandChanges, { onOpenChanges: noop, onToggleChanges: noop,
      repoMenuItems: REPO_ITEMS, branchMenuItems: [{ label: 'Open in terminal', separatorBefore: true, onSelect: noop }],
      verb: verb && { onClick: noop, disabled: verb.disabled, disabledReason: verb.disabledReason }, ...props }));
    const hold = (props) => renderToStaticMarkup(React.createElement(adapters.SessionBandHold, props));
    return await fn(rail, band, hold, adapters);
  } finally {
    for (const name of ['window', 'document']) {
      if (saved[name]) Object.defineProperty(globalThis, name, saved[name]);
      else delete globalThis[name];
    }
  }
}
const noTitles = (html, label) => assert.doesNotMatch(html, /\stitle="/, `${label}: no native title attribute`);
// shared-frame CdsDisabledReason (the rail verb's es): wrapper `aria-describedby=id` + hidden `[data-cds-disabled-reason]`.
function railDescribedReason(html) {
  const wrapper = html.match(/<span tabindex="0" aria-describedby="([^"]+)" data-cds-disabled-reason-wrapper="" class="([^"]*)"/);
  assert.ok(wrapper, 'the disabled verb sits in the focusable disabled-reason wrapper');
  const id = wrapper[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reason = html.match(new RegExp(`<span id="${id}" hidden="" data-cds-disabled-reason="">([^<]*)</span>`));
  assert.ok(reason, 'the described reason is a hidden span with the referenced id');
  return { reason: reason[1], wrapperClass: wrapper[2] };
}
test('gitRepoMenuItems: Ko/qo groups — Show in Finder | separator | Copy path; absent rows drop their group', () => {
  // c856385e2 wn → c18ab0d94 b(): the shared reveal label is 'Show in Finder' on macOS.
  assert.deepEqual(gitRepoMenuItems(), [{ label: 'Show in Finder' }, { label: 'Copy path', separatorBefore: true }]);
  assert.deepEqual(gitRepoMenuItems({ openFolder: false }), [{ label: 'Copy path' }], 'the first non-empty group carries no separator');
  assert.deepEqual(gitRepoMenuItems({ copyPath: false }), [{ label: 'Show in Finder' }]);
  assert.deepEqual(gitRepoMenuItems({ openFolder: false, copyPath: false }), []);
  // The composer's folder menu also opens a terminal there (its last group).
  assert.deepEqual(gitRepoMenuItems({ openTerminal: true }).at(-1), { label: 'Open in terminal', separatorBefore: true });
});

// W14-code r7 css7-git-band-prbarrow (E84 / E95): the band is c96d752d0 Sje's band branch — `nav.flex.flex-col.has-[>*:empty]:hidden
// .gap-xs > div.{nR}.gap-xs` around Zje's `f(EL, { order: T?.get(n), ...or })` — the generated EL (PrBarRow) without layout
// "rail". The host SourceGitStatus row (.sg-*) is gone.
const ROW_CLASS = 'flex items-center gap-[5px] w-full min-h-[40px] p-[8px] rounded-[10px] bg-alpha-1 @container/branch-row';
test('band: the generated EL band row — repo and branch chips, counts, Commit; a responding or committed Commit is described; a clean tree draws an empty list', () => withRail((rail, band) => {
  const sje = readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c96d752d0-CWv_7-n9.js'), 'utf8');
  for (const needle of ['f(EL,{order:T?.get(n),...or})', 'nR="scroll-fade-y flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain empty:hidden"'])
    assert.equal(sje.split(needle).length - 1, 1, needle);
  const idle = band({ status: dirty });
  noTitles(idle, 'idle');
  assert.ok(idle.startsWith('<nav aria-label="Repository and pull request controls" class="flex flex-col has-[&gt;*:empty]:hidden gap-xs"><div class="scroll-fade-y flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain empty:hidden gap-xs">'
    + `<div class="${ROW_CLASS}">`), idle.slice(0, 400));
  // dL: the repo chip opens the repo menu (commit mode: `!max-w-none`); gL: the branch chip, its name split head / tail.
  assert.match(idle, /class="[^"]* epitaxy-branch-repo !px-1\.25 !max-w-none" tabindex="0" aria-haspopup="menu"[^>]*>(?:(?!<\/button>).)*<span class="truncate">repo<\/span>/);
  assert.match(idle, /aria-label="feature\/a-rather-long-branch-name" tabindex="0" aria-haspopup="menu"/);
  assert.match(idle, /<span class="sr-only">3 additions, 1 deletion<\/span><span aria-hidden="true" class="contents"><span class="text-git-added">\+3<\/span><span class="text-git-removed">−1<\/span><\/span>/);
  assert.match(idle, /<span class="inline-flex min-w-0 items-center gap-1 ">Commit changes<\/span><\/button>/);
  assert.doesNotMatch(idle, /aria-describedby/, 'an enabled Commit has no described reason');
  assert.doesNotMatch(idle, /aria-label="Dismiss"|sg-/, 'commit mode has no Dismiss; no host classes');
  const running = band({ status: dirty, verb: commitAction(dirty, { responding: true }) });
  noTitles(running, 'running');
  assert.equal(railDescribedReason(running).reason, COMMIT_RESPONDING_REASON);
  assert.match(running, /<button type="button" disabled="" data-cds="Button"[^>]*>(?:(?!<\/button>).)*Commit changes/);
  // After a commit the branch stats keep the band; Commit is disabled with 'No changes to commit'.
  assert.equal(railDescribedReason(band({ status: { ...dirty, workingTreeDirty: false }, verb: commitAction({ ...dirty, workingTreeDirty: false }) })).reason, COMMIT_CLEAN_REASON);
  // cMe: no changes and no PR — no row; the list stays empty, so `has-[>*:empty]:hidden` hides the band.
  assert.equal(band({ status: clean, verb: commitAction(clean) }), '<nav aria-label="Repository and pull request controls" class="flex flex-col has-[&gt;*:empty]:hidden gap-xs"><div class="scroll-fade-y flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain empty:hidden gap-xs"></div></nav>');
  assert.equal(band({ status: { isRepo: false } }), '');
}));

test('band: behind (Zje JAe) is EL\'s role=img ArrowDown + count without a title', () => withRail((rail, band) => {
  const html = band({ status: dirty, behind: { count: 2, tooltip: '2 commits behind main' } });
  noTitles(html, 'behind');
  assert.ok(html.includes('<span role="img" aria-label="2 commits behind main" class="shrink-0 inline-flex h-control items-center gap-0.75 px-1.25 text-body-medium text-muted-as-secondary"'));
  assert.ok(html.includes('<span class="tabular-nums">2</span></span>'));
  assert.doesNotMatch(band({ status: dirty, behind: { count: 0, tooltip: 'x' } }), /commits behind/);
}));

test('rail (2.42304.0 flat Changes row): no native titles; a responding Commit is described in the DLe min-w-0 shrink-0 wrapper; a clean branch leaves the nav empty', () => withRail((rail) => {
  const idle = rail({ status: dirty, verb: commitAction(dirty) });
  noTitles(idle, 'rail idle');
  // OLe's row branch (no PR link, "row" layout): the counts button and the ⋮ name the branch; a single repo hides its name.
  assert.match(idle, /<div data-rail-changes-row="" class="flex min-h-6\.5 w-full min-w-0 items-center gap-sm px-xs text-body">/);
  assert.match(idle, /aria-label="Open changes, 3 added, 1 removed"/);
  assert.match(idle, /aria-label="More options for feature\/a-rather-long-branch-name"/);
  assert.doesNotMatch(idle, />repo<\/span>/);
  assert.doesNotMatch(idle, /aria-describedby/, 'an enabled Commit has no described reason');

  const running = rail({ status: dirty, verb: commitAction(dirty, { responding: true }) });
  noTitles(running, 'rail running');
  const described = railDescribedReason(running);
  assert.equal(described.reason, COMMIT_RESPONDING_REASON);
  assert.match(described.wrapperClass, / min-w-0 shrink-0$/, 'c96d752d0 DLe es wrapperClassName');
  assert.match(running, /<button type="button" disabled="" data-cds="Button" data-size="xs" class="[^"]* min-w-0 shrink-0">/);
  // The band and the rail take the same commit reasons (git-rail-model commitAction).
  assert.equal(railDescribedReason(rail({ status: { ...dirty, workingTreeDirty: false }, verb: commitAction({ ...dirty, workingTreeDirty: false }) })).reason, COMMIT_CLEAN_REASON);

  // eze/fze: no changes and no PR — the nav stays empty, so rD's `has-[nav:not(:empty)]:flex` keeps the card hidden.
  const hidden = rail({ status: clean, verb: commitAction(clean) });
  noTitles(hidden, 'rail clean');
  assert.equal(hidden, '<nav aria-label="Repository and pull request controls" class="flex flex-col gap-1 empty:hidden"></nav>');
}));

test('band stale hold (Sje gje / sAe): the held row is the generated aAe over c03935b01 An\'s snapshot — inert, aria-hidden, data-prbar-stale', () => withRail((rail, band, hold, adapters) => {
  const html = hold({ status: dirty, heightPx: 52 });
  assert.ok(html.startsWith('<nav aria-label="Repository and pull request controls" aria-hidden="true" class="flex flex-col  gap-xs"><div data-epitaxy-branch-row-ghost="" class="flex shrink-0 flex-col overflow-hidden [&amp;&gt;*]:shrink-0 gap-xs" style="height:52px">'
    + `<div data-prbar-stale="" aria-hidden="true" inert="" class="${ROW_CLASS} shrink-0 pointer-events-none opacity-60" style="order:1">`), html.slice(0, 500));
  assert.doesNotMatch(html, /<button|aria-haspopup|data-cds-tooltip/);
  assert.match(html, /<span class="truncate">repo<\/span>/);
  assert.match(html, /<span class="contents tabular-nums text-body-medium"><span class="text-git-added">\+3<\/span><span class="text-git-removed">−1<\/span><\/span>/);
  assert.match(html, />Commit changes<\/span><\/div><\/div><\/div><\/nav>$/);
  assert.equal(hold({ status: { isRepo: false } }), '');
  assert.deepEqual(adapters.bandHoldSnapshot(dirty), { id: { cwd: '/work/space/repo', repo: 'repo', branch: 'feature/a-rather-long-branch-name', history: null }, repoName: 'repo',
    branchName: 'feature/a-rather-long-branch-name', pr: null, diff: { added: 3, removed: 1 }, ci: false, action: 'commit', split: false, accent: false, dismissable: false });
  const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  assert.ok(readFileSync(path.join(v1, 'c96d752d0-CWv_7-n9.js'), 'utf8').includes('eAe="data-prbar-stale"'));
  assert.ok(readFileSync(path.join(v1, 'shared-46-BIbZBGFq.js'), 'utf8').includes('A_="data-epitaxy-branch-row-ghost"'));
}));

test('rail: the Commit verb keeps the composer\'s focus (c96d752d0 Fke wraps it in yL, `onMouseDown: Hv`)', async () => {
  // 3.6556.2 c96d752d0 Fke wraps the verb in yL, whose span has `onMouseDown: Hv` (`import{t as Hv}from"./c81ea1931-ChuE7vym.js"`:
  // c81ea1931 e, generated session-rail-kit preventMouseDown; 2.42304.0 DLe / Qz / i_). The band's EL uses the same yL.
  const verb = await fs.readFile(path.resolve(import.meta.dirname, '../src/generated/session-rail-changes/changes-verb.mjs'), 'utf8');
  assert.match(verb, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings from c96d752d0-CWv_7-n9\.js;/);
  assert.match(verb, /import \{ preventMouseDown as Hv \} from "\.\.\/session-rail-kit\/prevent-mouse-down\.mjs";/);
  assert.match(verb, /role: "none",\s*className: "contents",\s*onMouseDown: Hv,/);
  const original = readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c96d752d0-CWv_7-n9.js'), 'utf8');
  for (const needle of ['import{t as Hv}from"./c81ea1931-ChuE7vym.js"', 'f("span",{ref:a,role:"none",className:"contents",onMouseDown:Hv,children:i})', 'f(yL,{leftWithFocusRef:s,busy:n,onSettle:c,chi'])
    assert.equal(original.split(needle).length - 1, 1, needle);
  const prevent = await fs.readFile(path.resolve(import.meta.dirname, '../src/generated/session-rail-kit/prevent-mouse-down.mjs'), 'utf8');
  assert.match(prevent, /function e\(e\) \{\s*return e\.preventDefault\(\);\s*\}\s*export \{ e as preventMouseDown \};/);
});

test('rail: the counts are the generated c60636ac6 Xe (sr-only unit list + aria-hidden +/−); Commit is the generated CDS Button; SourceGitRail is retired', async () => {
  await withRail((rail) => {
    const html = rail({ status: dirty, verb: commitAction(dirty) });
    assert.match(html, /<span class="tabular-nums inline-flex shrink-0 gap-1 text-body"><span class="sr-only">3 additions, 1 deletion<\/span><span aria-hidden="true" class="contents"><span class="text-git-added">\+3<\/span><span class="text-git-removed">−1<\/span><\/span><\/span>/);
    assert.match(html, /<button type="button" data-cds="Button" data-size="xs" class="[^"]* min-w-0 shrink-0">.*<span class="truncate">Commit changes<\/span><\/span><\/button>/);
    assert.doesNotMatch(html, /\saria-busy="|sg-spinner/, 'a commit turn never makes the verb busy (rB: no busy label for commit)');
    assert.doesNotMatch(html, /data-git-counts|sgr-/);
  });
  // Retired: no host module renders or imports the 2.3x stacked rail any more.
  const src = path.resolve(import.meta.dirname, '../src');
  assert.equal(await fs.access(path.join(src, 'source-git-rail.jsx')).then(() => true, () => false), false, 'src/source-git-rail.jsx is removed');
  assert.equal(await fs.access(path.join(src, 'source-git-rail.css')).then(() => true, () => false), false, 'src/source-git-rail.css is removed');
  const hosts = (await fs.readdir(src, { recursive: true })).filter((name) => /\.(jsx?|mjs|css)$/.test(name) && !name.startsWith('generated'));
  const holders = [];
  for (const name of hosts) if (/SourceGitRail|source-git-rail|\bsgr-/.test(await fs.readFile(path.join(src, name), 'utf8'))) holders.push(name);
  assert.deepEqual(holders, []);
});

test('B08 band: an existing PR is EL\'s glyph + #number link; CI is a role=img; no Commit (Zje vt = hMe); the PR keeps a clean row', () => withRail((rail, band) => {
  const pr = { number: 42, url: 'https://github.com/acme/widget/pull/42', state: 'open', ci: 'failed', title: 'Add widget' };
  const html = band({ status: { ...dirty, workingTreeDirty: false }, pr, onOpenPr: noop });
  noTitles(html, 'pr view');
  assert.match(html, /<span role="img" aria-label="Open" class="shrink-0 inline-flex [^"]*"/);
  assert.match(html, /<a href="https:\/\/github.com\/acme\/widget\/pull\/42" target="_blank" rel="noopener"[^>]*><bdi>#42<\/bdi><\/a>/);
  assert.match(html, /aria-label="CI: checks failing"/);
  assert.match(html, /max-w-\[160px\] shrink/, 'view mode bounds the repo chip at 160px');
  assert.doesNotMatch(html, /Commit changes/);
  assert.match(band({ status: clean, pr: { ...pr, ci: undefined } }), /<bdi>#42<\/bdi>/);
}));

test('B08 band: a merged PR tints the row (bg-git-merged) and replaces the trailing controls with "Merged"', () => withRail((rail, band) => {
  const html = band({ status: dirty, pr: { number: 7, url: 'https://github.com/acme/widget/pull/7', state: 'merged', ci: 'passed' } });
  assert.match(html, /<div class="flex items-center gap-\[5px\] w-full min-h-\[40px\] p-\[8px\] rounded-\[10px\] bg-git-merged @container\/branch-row">/);
  assert.match(html, /<span role="img" aria-label="Merged"/);
  assert.match(html, />Merged<\/span><\/div><\/div><\/div><\/nav>$/);
  assert.doesNotMatch(html, /additions?,|CI:|Commit changes/, 'counts, CI and actions drop on an accent row');
}));

test('B08 band: Create PR is EL\'s split button (yL + CdsDisabledReason + Dke) with Zje\'s create-mode radio items; the gh hint and the warning', () => withRail((rail, band, hold, adapters) => {
  const calls = [];
  const prAction = { mode: 'draft', label: 'Create draft PR', busy: false, repo: 'https://github.com/acme/widget', onPrimary: (m) => calls.push(['fire', m]), onSelectMode: (m) => calls.push(['select', m]) };
  const committed = { ...dirty, workingTreeDirty: false };
  const html = band({ status: committed, prAction, hint: { cause: 'gh_signed_out', onRunInTerminal: noop }, warning: 'GitHub is unreachable. Pull request status may be out of date.' });
  noTitles(html, 'create');
  assert.match(html, /<span role="none" class="contents"><span tabindex="-1" data-cds-disabled-reason-wrapper="" class="inline-flex[^"]*"[^>]*><div data-cds="SplitDropdownButton" role="group" aria-label="Create draft PR"/);
  assert.match(html, /aria-label="More PR options"/);
  // c219730b0 ii (GhHint, EL prStatusHint): the CDS Popover.Trigger rendering the secondary d with the official class list
  // (no host hook class since W14-code r8 css8-gh-hint-popover-host) and the xs caret (0.75rem).
  assert.match(html, /<button type="button" data-cds="Button" class="cds-reset group\/btn [^"]* px-md [^"]*:\[--cds-shortcut-cap-ink:currentColor\] shrink-0 text-muted hover:text-secondary @max-\[699px\]\/branch-row:hidden" tabindex="0" data-base-ui-click-trigger="" id="[^"]+" aria-haspopup="dialog" aria-expanded="false">(?:(?!<\/button>).)*GitHub CLI signed out<span data-cds="Icon" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*" class="text-muted-as-secondary" aria-hidden="true">[^<]*<\/span><\/span><\/button>/);
  assert.doesNotMatch(html, /sg-gh-/);
  assert.match(html, /<span role="img" aria-label="GitHub is unreachable\. Pull request status may be out of date\." style="color:var\(--cds-text-warning\)"/);
  const pending = band({ status: committed, prAction: { ...prAction, mode: 'create', label: 'Create PR', disabledReason: 'Checking for an existing pull request' } });
  assert.equal(railDescribedReason(pending).reason, 'Checking for an existing pull request');
  // c96d752d0 Zje Bt: Create PR / Create draft PR select and fire, Manually create PR after a separator, disabled without a repo.
  const intl = { formatMessage: (m) => m.defaultMessage };
  const items = adapters.bandPrRowProps({ intl, status: committed, prAction: { ...prAction, mode: 'create' } }).prMenuItems;
  assert.deepEqual(items.map((item) => [item.label, item.checked, !!item.separatorBefore, !!item.disabled]),
    [['Create PR', true, false, false], ['Create draft PR', false, false, false], ['Manually create PR', false, true, false]]);
  items[1].onSelect(); items[2].onSelect();
  assert.deepEqual(calls, [['select', 'draft'], ['fire', 'draft'], ['select', 'compose']]);
  assert.equal(adapters.bandPrRowProps({ intl, status: committed, prAction: { ...prAction, repo: null } }).prMenuItems[2].disabled, true, '`bt = !i.repo`');
}));

test('band wiring: main.jsx draws SessionBandChanges / SessionBandHold; the host SourceGitStatus and its .sg-* rules are gone', async () => {
  const main = await fs.readFile(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.ok(main.includes('(bandStatus ? <SessionBandChanges status={bandStatus}'));
  assert.ok(main.includes(': bandHold ? <SessionBandHold status={bandHold.status} heightPx={bandHold.heightPx} /> : null)}'));
  assert.ok(main.includes('onMeasured={rememberBandHeight}'));
  assert.doesNotMatch(main, /SourceGitStatus/);
  const source = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-git-status.jsx'), 'utf8');
  assert.doesNotMatch(source.replace(/\/\/[^\n]*/g, ''), /export function SourceGitStatus|SourceGitStatusStale|prMenuItems|sg-row/);
  assert.match(source, /export function GhHint/);
  // W14-code r8 css8-gh-hint-popover-host: the hint's last hand-copied .sg-gh-* rules are gone, and with them the stylesheet.
  assert.equal(readFileSync(path.resolve(import.meta.dirname, '../src/source-git-status.jsx'), 'utf8').includes('import "./source-git-status.css"'), false);
  await assert.rejects(fs.access(path.resolve(import.meta.dirname, '../src/source-git-status.css')), { code: 'ENOENT' });
});

test('W14-code r8 css8-gh-hint-popover-host: GhHint is c219730b0 ii / ai verbatim (CDS Popover parts, official class strings)', async () => {
  const official = readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c219730b0-DGG9iA8k.js'), 'utf8');
  for (const needle of ['className:"epitaxy-root break-words w-72"', 'className:"flex flex-col gap-md"', 'className:"text-body text-primary"',
    'className:"flex justify-end"', 'className:"me-auto font-mono-ui text-code text-primary"',
    'className:"flex h-control items-center gap-sm rounded bg-alpha-1 ps-md pe-0.5"', '{name:"CaretDown",size:"xs",className:"text-muted-as-secondary"}',
    'side:"top",align:"end",sideOffset:8,padding:"md"'])
    assert.ok(official.includes(needle), needle);
  const source = (await fs.readFile(path.resolve(import.meta.dirname, '../src/source-git-status.jsx'), 'utf8')).replace(/^\s*(?:\/\/|\/\*\*|\*)[^\n]*\n/gm, '');
  assert.match(source, /import \{ CdsButton, CdsIcon, CdsPopover \} from "\.\/generated\/view-tabs\/index\.js";/);
  assert.doesNotMatch(source, /SourcePopover|\bIcon\b(?! name)|from "\.\/icons"|sg-gh-|\.css"/);
  for (const needle of [
    '<CdsPopover.Root>',
    '<CdsPopover.Trigger render={<CdsButton variant="secondary" className="shrink-0 text-muted hover:text-secondary @max-[699px]/branch-row:hidden">',
    '{text.trigger}<CdsIcon name="CaretDown" size="xs" className="text-muted-as-secondary" />',
    '<CdsPopover.Popup ref={popup} initialFocus={popup} side="top" align="end" sideOffset={8} padding="md" className="epitaxy-root break-words w-72">',
    '<div className="flex flex-col gap-md">',
    '<CdsPopover.Title className="text-body text-primary">{text.body}</CdsPopover.Title>',
    '{action ? <div className="flex justify-end">{action}</div> : null}',
    '<div className="flex h-control items-center gap-sm rounded bg-alpha-1 ps-md pe-0.5">',
    '<code className="me-auto font-mono-ui text-code text-primary">{command}</code>',
    '<CdsPopover.Close render={<CdsButton variant="ghost" size="sm" iconOnly icon="Play" aria-label={runLabel} tooltip={runLabel}',
    '<CdsButton variant="ghost" size="sm" iconOnly icon={copied ? "Check" : "Copy"} aria-label={copyLabel} tooltip={copied ? t("Copied") : copyLabel}',
  ]) assert.ok(source.includes(needle), needle);
});

test('B08 review: the gh lookup warning (cd5a31703 FB H) shows in every mode', async () => {
  const { prStatusWarning } = await import('../src/git-rail-model.mjs');
  assert.equal(prStatusWarning({ status: 'error', kind: 'network' }), 'GitHub is unreachable. Pull request status may be out of date.');
  assert.equal(prStatusWarning({ status: 'auth', kind: 'auth' }), 'GitHub CLI authentication expired. Run gh auth login to refresh pull request status.');
  assert.equal(prStatusWarning({ status: 'error' }), 'Pull request status couldn’t be checked and may be out of date.');
  assert.equal(prStatusWarning({ status: 'error', kind: 'notFound' }), undefined, 'gO keeps no warning for notFound');
  assert.equal(prStatusWarning({ status: 'missing' }), undefined);
  assert.equal(prStatusWarning({ status: 'none' }), undefined);
  // The accent row keeps the warning (EL `Je` sits before the accent check).
  await withRail((rail, band) => {
    const warning = 'GitHub is unreachable. Pull request status may be out of date.';
    const html = band({ status: dirty, pr: { number: 7, url: 'https://github.com/acme/widget/pull/7', state: 'merged', ci: 'passed', title: 'Add widget' }, warning });
    noTitles(html, 'warning');
    assert.ok(html.includes(`<span role="img" aria-label="${warning}"`));
    assert.doesNotMatch(band({ status: dirty }), /cds-text-warning/);
  });
});

test('r6 git css6-archived-discard: c9543da06 yu kept-worktree sentence and ghost Discard changes over worktree-status / worktree-remove', async () => {
  const B = await server.ssrLoadModule('/src/source-archived-banner.jsx');
  // Without a kept dirty worktree the banner is the r2 yu row (no sentence, no Discard).
  const plain = renderToStaticMarkup(React.createElement(B.SourceArchivedBanner, { onUnarchive: noop, sessionId: 's', call: async () => null, confirmDiscard: async () => true }));
  assert.match(plain, /<span class="text-primary">This session is archived\. Unarchive it to keep working in this session\.<\/span>/);
  assert.doesNotMatch(plain, /Discard changes/);
  // yu `b`: one worktree, or the folders' conjunction list (Re = the folder name).
  assert.equal(B.keptWorktreeSentence([]), null);
  assert.equal(B.keptWorktreeSentence(['/w/a']), 'Its worktree still has uncommitted changes on disk.');
  assert.equal(B.keptWorktreeSentence(['/w/a', '/w/b']), 'Worktrees for a and b still have uncommitted changes on disk.');
  const kept = renderToStaticMarkup(React.createElement(B.ArchivedBannerContent, { folders: ['/w/a'], onUnarchive: noop, onDiscard: noop }));
  assert.match(kept, /<span class="text-primary">This session is archived\. Unarchive it to keep working in this session\. Its worktree still has uncommitted changes on disk\.<\/span>/);
  // yu O: lo > S {variant ghost, size sm, className shrink-0} "Discard changes" after Unarchive.
  assert.match(kept, /Unarchive<\/span><\/button><\/span><span class="flex h-\[1lh\] shrink-0 items-center"><button type="button" data-cds="Button" data-cds-ghost="" data-size="sm" class="[^"]*shrink-0[^"]*">(?:(?!<\/button>).)*Discard changes/);
  const busy = renderToStaticMarkup(React.createElement(B.ArchivedBannerContent, { folders: ['/w/a'], discarding: true, onUnarchive: noop, onDiscard: noop }));
  assert.match(busy, /<span role="status" class="sr-only">Discarding changes…<\/span>/);
  assert.match(busy, /<button type="button" disabled="" data-cds="Button" data-size="sm"[^>]*>(?:(?!<\/button>).)*Unarchive/, 'yu: Unarchive is disabled while discarding');
  // shared-46 Mo outcomes: busy → Erym+s6Q28, error → cq1aNrCAVL.
  assert.equal(B.discardOutcomeMessage({ removed: true }), null);
  assert.equal(B.discardOutcomeMessage({ removed: false, inUse: true }), 'Couldn’t discard changes because the worktree is in use. Try again shortly.');
  assert.equal(B.discardOutcomeMessage({ removed: false }), 'Couldn’t discard changes. Try again.');
  const run = async (status, removal, accept = true) => {
    const calls = [], errors = [], asked = [];
    const call = async (channel, payload) => { calls.push([channel, payload]); if (channel === 'worktree-status') return status; if (removal instanceof Error) throw removal; return removal; };
    const outcome = await B.discardKeptWorktree({ sessionId: 's', call, fallback: '/w/a', confirmDiscard: async (entry) => { asked.push(entry); return accept; }, onError: (m) => errors.push(m) });
    return { outcome, calls, errors, asked };
  };
  const dirty = { worktree: '/w/a', shared: false, changes: 2, files: [' M a', '?? b'] };
  let r = await run(dirty, { removed: true });
  assert.deepEqual([r.outcome, r.asked[0].action, r.calls.map(([c]) => c)], ['discarded', 'discard', ['worktree-status', 'worktree-remove']]);
  assert.deepEqual(r.calls[1][1], { worktree: '/w/a' });
  r = await run(dirty, { removed: false, inUse: true });
  assert.deepEqual([r.outcome, r.errors], ['failed', ['Couldn’t discard changes because the worktree is in use. Try again shortly.']]);
  r = await run(dirty, new Error('boom'));
  assert.deepEqual([r.outcome, r.errors], ['failed', ['Couldn’t discard changes. Try again.']]);
  r = await run(dirty, { removed: true }, false);
  assert.deepEqual([r.outcome, r.calls.length], ['cancelled', 1]);
  r = await run({ worktree: '/w/a', shared: false, changes: 0, files: [] }, { removed: true });
  assert.deepEqual([r.outcome, r.asked.length], ['kept', 0], 'a clean worktree is Mo not_kept: refresh only');
  // The host wiring: main.jsx passes the session, the bridge and the worktree queue; main.cjs reports a live user as inUse.
  const main = await fs.readFile(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.ok(main.includes('sessionId={current} call={call} confirmDiscard={worktreeGateHost.enqueue}'));
  const mainCjs = await fs.readFile(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.ok(mainCjs.includes('if (users.length) return { removed: false, inUse: true };'));
  // The confirm is the worktree queue dialog with shared-46 WD's discard copy.
  const dispose = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-worktree-dispose-dialog.jsx'), 'utf8');
  assert.ok(dispose.includes('worktreeConfirmCopyOf(intl, "discard", phase,'));
});
