// host-wiring/chat (4.16336.0): the chat host files draw their own CDS markup from the cds-core graph (src/cds-core.mjs, the
// generated 4.16336.0 shared-frame-CJdE5Ria originals), while every value a 3.6556.2 region renders (a slot, an adapter,
// a render prop) keeps the 3.6556.2 view-tabs component it was sliced against. Source contracts, facade identity, and
// SSR under the host React with graph markers (the 4.16336.0 ghost Button class carries
// `not-in-data-[cds=SplitDropdownButton]`, the 3.6556.2 one does not; the 4.16336.0 Banner sets
// `[--cds-text-link-color:initial]`). Report: analysis/claude-4.16336.0-migrate-20261104/host-wiring/chat.json.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const h = React.createElement;
const VT_INDEX = './generated/view-tabs/index.js';
const VT_FRAME = './generated/view-tabs/shared-frame-6jtSkIit.js';
const importLine = (source, from) => [...source.matchAll(/^import \{([^}]*)\} from ["']([^"']+)["'];/gm)]
  .filter((m) => m[2] === from).map((m) => m[1].split(',').map((s) => s.trim()).filter(Boolean)).flat();

// file → { core: names from ./cds-core.mjs, old: names (as imported) still from a view-tabs file, from: that file }
const CONTRACT = {
  'source-async-questions.jsx': { core: ['CdsButton', 'CdsTextArea', 'cdsClassNames'], old: ['cdsCheckboxTopAlignClass'], from: VT_INDEX },
  'source-approval-card.jsx': { core: ['CdsButton', 'CdsCard', 'CdsCollapsible', 'CdsTextLink', 'cdsClassNames'], old: [], from: VT_INDEX },
  'source-chat-model-menu.jsx': { core: ['CdsBadge'], old: [], from: VT_FRAME },
  // surfaces-prod-3 composer (host cutover): the Chat / Cowork card is the 4.16336.0 ChatComposer (code-composer-v4), so its
  // own markup and its layout context (shared-26 Mp) are cds-core's.
  'source-chat-composer.jsx': { core: ['CdsBanner', 'CdsButton', 'CdsIcon', 'CdsSpinner', 'cdsClassNames', 'ChatComposerLayoutContext as Layout'], old: [], from: VT_FRAME },
  'source-chat-tools-menu.jsx': { core: ['CdsButton', 'CdsTooltip'], old: [], from: VT_FRAME },
  'source-composer-tiles.jsx': { core: ['CdsConfirmationDialog', 'CdsContextMenu', 'CdsIcon'], old: [], from: VT_FRAME },
  'source-composer-add-menu.jsx': { core: ['CdsButton', 'CdsIcon', 'CdsTooltip', 'cdsClassNames'], old: [], from: VT_FRAME },
  'source-composer-row-chin.jsx': { core: ['CdsButton', 'CdsLoadingSkeleton', 'CdsSkeleton', 'CdsSpinner', 'CdsTooltip', 'cdsClassNames'], old: [], from: VT_FRAME },
  'source-composer-shell.jsx': { core: ['ChatComposerLayoutContext', 'cdsClassNames'], old: [], from: VT_FRAME },
  'source-composer-attachments.jsx': { core: ['CdsSkeleton'], old: [], from: VT_FRAME },
  'source-composer-attachment-adapters.jsx': { core: ['CdsTooltip'], old: [], from: VT_FRAME },
  'source-codex-feedback.jsx': { core: ['CdsButton'], old: [], from: VT_FRAME },
  'source-composer-folder-menu.jsx': { core: ['CdsCheckbox', 'CdsIcon'], old: [], from: VT_INDEX },
  'source-composer-editor.jsx': { core: ['CdsButton'], old: [], from: VT_FRAME },
  // composer-env (surfaces-prod-2): the Home environment bar is the 4.16336.0 vge (code-composer-v4), so its own markup is cds-core.
  'source-composer-environment-bar.jsx': { core: ['CdsButton', 'CdsIcon', 'CdsTextLink', 'CdsTooltip', 'cdsClassNames'], old: [], from: VT_FRAME },
  'source-composer.jsx': { core: ['CdsBadge', 'CdsButton', 'CdsDisabledReason', 'CdsIcon', 'CdsOverflowTooltip', 'CdsTextLink', 'cdsClassNames'], old: [], from: VT_FRAME },
  'source-discard-draft.jsx': { core: ['CdsButton'], old: [], from: VT_INDEX },
  // chat-header 4.16336.0: the shell draws no CDS markup of its own; its top bar (the Exit X included) is the sliced
  // shared-20 Yw → Xw / Zw → Ix (generated/chat-header, cds-core graph) through chat-header-host.jsx.
  'source-incognito-shell.jsx': { core: [], old: [], from: VT_INDEX },
  'source-model-menu.jsx': { core: ['CdsBadge', 'CdsHiddenReasonText', 'CdsTextInput'], old: [], from: VT_INDEX },
  'source-nested-sessions-confirm.jsx': { core: ['CdsButton'], old: [], from: VT_INDEX },
  'source-question-card.jsx': { core: ['CdsButton', 'CdsTextArea', 'CdsShortcut', 'CdsCheckboxIndicator', 'cdsCheckboxTopAlignClass', 'cdsClassNames'],
    old: ['CdsButton as ViewTabsCdsButton', 'CdsIcon as ViewTabsCdsIcon', 'cdsCheckboxTopAlignClass as viewTabsCheckboxTopAlignClass'], from: VT_INDEX },
  'source-user-message-edit.jsx': { core: ['CdsButton', 'CdsIcon', 'CdsTooltip', 'cdsClassNames'], old: [], from: VT_INDEX },
  'source-turn-error.jsx': { core: ['CdsButton'], old: ['CdsButton as ViewTabsCdsButton'], from: VT_FRAME },
};
// Files whose every CDS value is rendered by a 3.6556.2 region (slots / adapters / render props): they stay on view-tabs.
const KEPT = {
  'source-chat-renderer-adapters.jsx': [VT_FRAME, ['CdsIcon']],
  'source-session-notices.jsx': [VT_INDEX, ['CdsBanner', 'CdsButton']],
};

let server, facade, viewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  facade = await server.ssrLoadModule('/src/cds-core.mjs');
  viewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
});
after(async () => { await server?.close(); });

test('switched files import their own-markup CDS names from the cds-core facade; region values keep their view-tabs import', () => {
  for (const [file, { core, old, from }] of Object.entries(CONTRACT)) {
    const source = local(`src/${file}`);
    assert.deepEqual(importLine(source, './cds-core.mjs').sort(), [...core].sort(), `${file} cds-core names`);
    assert.deepEqual(importLine(source, from).sort(), [...old].sort(), `${file} view-tabs names`);
    const otherViewTabs = [VT_INDEX, VT_FRAME].filter((f) => f !== from);
    for (const other of otherViewTabs) assert.deepEqual(importLine(source, other), [], `${file} has no ${other} import`);
  }
  for (const [file, [from, names]] of Object.entries(KEPT)) {
    const source = local(`src/${file}`);
    assert.deepEqual(importLine(source, './cds-core.mjs'), [], `${file} renders only into 3.6556.2 regions`);
    assert.deepEqual(importLine(source, from).sort(), [...names].sort(), `${file} view-tabs names`);
  }
});

test('the facade names the switched files use are the generated 4.16336.0 objects, distinct from the 3.6556.2 ones', () => {
  const manifest = JSON.parse(local('src/generated/cds-core/manifest.json'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  const names = new Set(Object.values(CONTRACT).flatMap(({ core }) => core.map((n) => n.split(' as ')[0])));
  // ChatComposerLayoutContext is the one non-frame name (4.16336.0 moved it to shared-26 Mp; surfaces-prod-3 composer).
  const fileOf = (name) => (name === 'ChatComposerLayoutContext' ? 'shared-26-B-POtn5S.js' : 'shared-frame-CJdE5Ria.js');
  for (const name of names) {
    assert.ok(manifest.publicNames[name], `${name} is a cds-core publicName`);
    assert.equal(manifest.publicNames[name].file, fileOf(name), name);
    assert.ok(facade[name] !== undefined, name);
    if (typeof viewTabs[name] === 'object' || typeof viewTabs[name] === 'function') {
      if (name !== 'cdsClassNames' && name !== 'cdsCheckboxTopAlignClass') assert.notEqual(facade[name], viewTabs[name], `${name} is the 4.16336.0 binding`);
    }
  }
  // The two class values the files split by graph are the same string on both graphs; only the owner differs.
  assert.equal(facade.cdsCheckboxTopAlignClass, viewTabs.cdsCheckboxTopAlignClass);
});

test('kept-on-3.6556.2 placements: region slots and render props are wired to the view-tabs components', () => {
  const composer = local('src/source-composer.jsx');
  // surfaces-prod-3 composer: the line note's EnvironmentBar is the 4.16336.0 vge (cds-core graph), like the block form.
  assert.ok(composer.includes('const Link = CdsTextLink;'), 'line note goes into EnvironmentBar');
  assert.ok(!composer.includes('ViewTabsCdsTextLink'));
  assert.ok(composer.includes('trailing={bashMode ? <CdsBadge aria-hidden variant="pro" size="sm"'), 'bash Badge is the Actions slot value');
  assert.ok(composer.includes('<CdsDisabledReason reason={disabledReason} wrapperClassName="min-w-0 shrink-0">\n        <CdsButton ref={button} size="xs"'),
    'Compact session: DisabledReason and Button on one graph');
  const question = local('src/source-question-card.jsx');
  assert.ok(question.includes('<ViewTabsCdsButton size="base" variant="ghost" iconOnly\n              icon={<ViewTabsCdsIcon name="CaretRight"'), 'header trailing slot');
  assert.ok(question.includes('<QuestionRadioMark checked={checked} className={viewTabsCheckboxTopAlignClass} />'));
  assert.ok(question.includes('<CdsCheckboxIndicator checked={checked} className={cdsCheckboxTopAlignClass} />'));
  const turn = local('src/source-turn-error.jsx');
  assert.ok(turn.includes('function OfficialButton({ size: _size, iconSize: _iconSize, ...props }) {\n  return <ViewTabsCdsButton {...props} />;'));
  assert.ok(turn.includes('const Button = official ? OfficialButton : CdsButton;'));
  // The incognito exit is 4.16336.0 shared-20 Ix itself (generated/chat-header/top-bar.mjs): Root {mode, className
  // "contents"} > Tooltip {hoverable false} > X, with O / U / k the cds-core graph's Root / Tooltip / Button.
  const incognito = local('src/source-incognito-shell.jsx');
  assert.ok(incognito.includes('import { ChatDesktopTopBar } from "./chat-header-host.jsx";'));
  assert.ok(incognito.includes('<ChatDesktopTopBar incognito onToggleIncognito={onExit} pathname={pathname} />'));
  const topBar = local('src/generated/chat-header/top-bar.mjs');
  for (const binding of ['CdsRoot as O,', 'CdsTooltip as U,', 'CdsButton as k,']) assert.ok(topBar.includes(binding), binding);
  assert.ok(topBar.includes('} from "../cds-core/shared-frame.mjs";'));
  const official = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/shared-20-DUEo90UF.js'), 'utf8');
  assert.ok(official.includes('i(U,{hoverable:!1,side:o,shortcut:a,content:h,children:v})'));
  assert.ok(official.includes('i(k,{variant:"ghost",iconOnly:!0,size:c,icon:g,tooltip:!1,className:_,"aria-label":f,disabled:p,onClick:n})'));
  assert.ok(official.includes('i(O,{mode:b,className:"contents",children:x})'));
  // The user-message note relies on hovering into its tooltip: 4.16336.0's hoverable default is false, so it stays explicit.
  assert.ok(local('src/source-user-message-edit.jsx').includes('<CdsTooltip content={note} side="top" hoverable={true}>'));
});

const ghostTags = (out) => [...out.matchAll(/<button[^>]*data-cds="Button"[^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes('data-cds-ghost'));
const newGhost = (out) => ghostTags(out).some((tag) => tag.includes('not-in-data-[cds=SplitDropdownButton]'));
const oldGhost = (out) => ghostTags(out).some((tag) => !tag.includes('not-in-data-[cds=SplitDropdownButton]'));

test('markers: the 4.16336.0 and 3.6556.2 ghost Buttons are told apart by their class', () => {
  const props = { variant: 'ghost', iconOnly: true, icon: 'X', 'aria-label': 'x' };
  assert.ok(newGhost(renderToStaticMarkup(h(facade.CdsButton, props))));
  assert.ok(!oldGhost(renderToStaticMarkup(h(facade.CdsButton, props))));
  assert.ok(oldGhost(renderToStaticMarkup(h(viewTabs.CdsButton, props))));
  assert.ok(!newGhost(renderToStaticMarkup(h(viewTabs.CdsButton, props))));
});

test('SSR: the Chat turn-error card draws cds-core Buttons; the official card keeps the 3.6556.2 ones it renders', async () => {
  const M = await server.ssrLoadModule('/src/source-turn-error.jsx');
  const host = renderToStaticMarkup(h(M.SourceTurnError, { error: { message: 'boom' }, turnId: 't1', onRetry() {}, onDismiss() {} }));
  assert.match(host, /data-turn-error="card"/);
  assert.ok(newGhost(host) && !oldGhost(host), 'Dismiss / Copy details are 4.16336.0');
  const official = renderToStaticMarkup(h(M.SourceTurnError, { error: { message: 'boom' }, turnId: 't1', official: true, onRetry() {}, onDismiss() {} }));
  assert.ok(oldGhost(official) && !newGhost(official), 'cb1a6e506 j and its actions stay 3.6556.2');
});

test('SSR: the image-limit band is the cds-core Banner with a 4.16336.0 Dismiss', async () => {
  const M = await server.ssrLoadModule('/src/source-chat-composer.jsx');
  const html = renderToStaticMarkup(h(M.ChatImageLimitNotice, { notice: { key: 'approaching', text: 'Limit' }, conversationId: 'c1' }));
  assert.match(html, /^<div data-cds="Banner"/);
  assert.ok(html.includes('[--cds-text-link-color:initial]'), '4.16336.0 Banner');
  assert.ok(newGhost(html) && !oldGhost(html));
});

test('SSR: Exit incognito renders the cds-core Root, Tooltip trigger and ghost X', async () => {
  const M = await server.ssrLoadModule('/src/source-incognito-shell.jsx');
  const F = await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  const html = renderToStaticMarkup(h(F.FrameSidebarHost, { value: { platform: 'mac', zoomFactor: 1 } },
    h(M.SourceIncognitoShell, { active: true, onExit() {}, pathname: '/new' })));
  assert.match(html, /<div class="cds-root text-primary contents"[^>]*data-mode="dark"[^>]*><button[^>]*aria-label="Exit incognito"/);
  assert.ok(newGhost(html) && !oldGhost(html));
});

test('every switched module loads through Vite SSR under the host React', async () => {
  for (const file of [...Object.keys(CONTRACT), ...Object.keys(KEPT)]) await server.ssrLoadModule(`/src/${file}`);
});
