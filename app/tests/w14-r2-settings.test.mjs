// W14-code round 2, lane "settings": the shared Dialog (r2-shared-06 / css2-dialog-body), the Code composer gutter
// (css2-composer-gutter-780), the attachment pending overlay and Customize spinners (css2-spinner-attachment), the plugin
// install / update toasts (r2-shared-03 / r2-shared-09), the connector workspace trust (r2-shared-14) and the rewind
// confirm's git colours (DC-12). Source-only: SSR, the official chunks parsed as text, pure models.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const frame = fs.readFileSync(path.join(app, 'src/generated/view-tabs/shared-frame-6jtSkIit.js'), 'utf8');
const h = React.createElement;
let server, Dialog, Actions, Attachments, Model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // SourceDialog portals to <body>; the server renderer has no portals, so render them inline (as w12b-settings-dialogs).
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Dialog = await server.ssrLoadModule('/src/source-dialog.jsx');
  Actions = await server.ssrLoadModule('/src/source-session-actions.jsx');
  Attachments = await server.ssrLoadModule('/src/source-composer-attachments.jsx');
  Model = await server.ssrLoadModule('/src/customize-model.mjs');
});
after(() => server?.close());
const withDocument = (render) => {
  const had = 'document' in globalThis;
  if (!had) globalThis.document = { body: {}, documentElement: { getAttribute: () => null } };
  try { return render(); } finally { if (!had) delete globalThis.document; }
};
const officialVar = (name) => { const match = frame.match(new RegExp(`(?:^|\\n)var ${name.replace('$', '\\$')}=("[^"]*"|\`[^\`]*\`);`)); assert.ok(match, name); return match[1].slice(1, -1); };
const ZV = officialVar('Zv'), SY = officialVar('Sy'), CY = officialVar('Cy'), MY = officialVar('my'), HY = officialVar('hy');

test('r2-shared-06 official: Zv body, Sy/Cy nested state, xy drag strip, wy 3xl, Popup qy children in the Zv body', () => {
  assert.equal(ZV, 'isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl break-words');
  assert.ok(SY.endsWith('data-[nested-dialog-open]:after:opacity-100') && CY === 'data-[nested-dialog-open]:blur-[2px]');
  assert.ok(frame.includes('b("div",{"aria-hidden":!0,"data-cds-window-drag-strip":"",className:"fixed inset-x-0 top-0",style:by})'));
  assert.ok(frame.includes('var by={height:"var(--desktop-titlebar-inset, 0px)",WebkitAppRegion:"drag"};'));
  assert.ok(frame.includes('"3xl":"max-w-[1152px]"'));
  assert.ok(frame.includes('b("div",{className:Zv,children:i})'));
  assert.ok(frame.includes('Q("draggable-none",Sy,Xv,my,Cy,Ee,De,h)'), 'ConfirmationDialog popup classes');
  assert.ok(frame.includes('b(St,{className:c(jy,ky,"text-primary"),children:r})') && frame.includes('i&&b(a,{className:he?dy:Ny,children:i})'));
  // The host copies the strings verbatim (E84 step 2) rather than importing them (E41: the composer graph imports it).
  const dialog = read('src/source-dialog.jsx');
  for (const [name, value] of [['BODY_CLASS', ZV], ['NESTED_OVERLAY_CLASS', SY], ['NESTED_BLUR_CLASS', CY], ['POPUP_TRANSITION_CLASS', MY]])
    assert.ok(dialog.includes(`const ${name} = "${value}";`), name);
  assert.ok(dialog.includes(`const BACKDROP_CLASS = "${HY} starting:opacity-0"; // Q(hy, gy)`));
  // W14-code r6 sh6-03: the close X and Cancel / Confirm are shared-frame Uu, imported straight from the shared-frame
  // file (E41), never through the view-tabs index facade.
  assert.doesNotMatch(dialog, /generated\/view-tabs\/index/);
  assert.match(dialog, /import \{ CdsButton \} from "\.\/generated\/view-tabs\/shared-frame-6jtSkIit\.js";/);
});

test('r2-shared-06 SSR: portal > [backdrop, drag strip, popup > Zv body > header, content, footer]; the popup has no padding of its own', () => {
  const html = withDocument(() => renderToStaticMarkup(h(Dialog.SourceDialog, { title: 'Title', description: 'More', onClose() {}, footer: h('button', null, 'OK') }, h('p', { id: 'content' }, 'Body'))));
  const portal = html.match(/^<div class="sdlg-portal cds-root relative" data-cds-portal=""[^>]*>(.*)<\/div>$/s);
  assert.ok(portal, html);
  const [backdrop, strip, section] = [...portal[1].matchAll(/<(div|section)\b[^>]*>/g)].map((m) => m[0]);
  assert.match(backdrop, /^<div class="sdlg-backdrop draggable-none fixed inset-0 bg-backdrop [^"]*has-\[~\[data-nested\]\]:bg-transparent[^"]*" role="presentation"/);
  assert.equal(strip, '<div aria-hidden="true" data-cds-window-drag-strip="" class="fixed inset-x-0 top-0" style="height:var(--desktop-titlebar-inset, 0px);-webkit-app-region:drag">');
  assert.match(section, /^<section role="dialog" aria-modal="true" aria-labelledby="[^"]+" aria-describedby="[^"]+" tabindex="-1" data-cds="Dialog"/);
  assert.ok(section.includes(`class="sdlg-popup draggable-none ${SY} fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col `), section);
  assert.match(section, / max-w-\[520px\]"/);
  assert.doesNotMatch(section, /\bp-xl\b|overflow-y-auto|data-nested/);
  assert.match(html, new RegExp(`<div class="${ZV.replace(/[[\]().*+?]/g, '\\$&')}"><div class="sdlg-header mb-pad-md flex items-start gap-2"><div class="-mt-1 flex min-w-0 flex-1 flex-col gap-1"><h2 id="[^"]+" class="text-primary text-title font-semibold font-header break-words">Title</h2><p id="[^"]+" class="sdlg-description text-body font-normal text-secondary break-words">More</p></div><button[^>]*class="[^"]*-me-pad-sm -mt-pad-sm"[^>]*aria-label="Close"`)); // W14-code r6 sh6-03: CdsButton (Xy) writes class before aria-label
  assert.match(html, /<p id="content">Body<\/p><div class="sdlg-footer mt-pad-lg flex flex-col-reverse gap-2 sm:flex-row max-sm:\[&amp;&gt;\[data-cds-disabled-reason-wrapper\]\]:flex-col sm:justify-end"><button>OK<\/button><\/div><\/div><\/section><\/div>$/);
  assert.match(withDocument(() => renderToStaticMarkup(h(Dialog.SourceDialog, { title: 'T', size: '3xl', onClose() {} }))), /max-w-\[1152px\]/);
});

test('r2-shared-06 SSR: ConfirmationDialog (ab) keeps its title and description straight in the body; a nested dialog is data-nested', () => {
  const html = withDocument(() => renderToStaticMarkup(h(Dialog.SourceConfirmationDialog, { title: 'Delete?', body: 'Gone for good.', confirmLabel: 'Delete', confirmVariant: 'danger', onConfirm() {}, onCancel() {} })));
  assert.match(html, /<section role="alertdialog"[^>]*data-cds="ConfirmationDialog"[^>]*class="sdlg-popup draggable-none [^"]* max-w-\[400px\]">/);
  assert.match(html, /<div class="isolate flex [^"]*"><h2 id="[^"]+" class="-mt-0\.5 text-heading font-medium font-header break-words text-primary">Delete\?<\/h2><p id="[^"]+" class="sdlg-description mt-1 text-body font-normal text-secondary break-words">Gone for good\.<\/p><div class="sdlg-footer [^"]*"><button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*?bg-fill-secondary (?:(?!<\/button>).)*?Cancel.*?<\/button><button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*?bg-fill-danger(?:(?!<\/button>).)*?Delete.*?<\/button><\/div><\/div>/); // W14-code r6 sh6-03: ab's Uu buttons (variant = paint)
  // Base UI nesting: the confirm opened inside a dialog is data-nested (its backdrop turns transparent through hy's has-[~[data-nested]]).
  const nested = withDocument(() => renderToStaticMarkup(h(Dialog.SourceDialog, { title: 'Parent', onClose() {} },
    h(Dialog.SourceConfirmationDialog, { title: 'Child', body: 'x', onConfirm() {}, onCancel() {} }))));
  const sections = [...nested.matchAll(/<section\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(sections.length, 2);
  assert.doesNotMatch(sections[0], /data-nested=/);
  assert.match(sections[1], /data-nested=""/);
});

test('r2-shared-06: the callers keep close, focus and Escape (the host behaviour is unchanged); the host popup CSS is gone', () => {
  const dialog = read('src/source-dialog.jsx');
  for (const line of [
    'if (event.key === "Escape" && !event.nativeEvent.isComposing) {',
    'if ([...doc.querySelectorAll(\'[aria-modal="true"]\')].at(-1) !== popup.current) return;',
    'const release = holdModalInert(doc.getElementById("root"));',
    '(initialFocusRef?.current ?? node.querySelector("[data-autofocus]:not(:disabled)") ?? node).focus({ preventScroll: true });',
    'if (lost && target?.isConnected && target !== doc.body && !target.closest("[inert]")) target.focus({ preventScroll: true });',
    'if (!alert && open) close.current?.("outside-press");',
    '{showClose && <SourceDialogCloseButton flush onClick={() => close.current?.("close-press")} />}',
  ]) assert.ok(dialog.includes(line), line);
  const css = read('src/source-dialog.css');
  assert.doesNotMatch(css, /\.sdlg-popup \{|\.sdlg-header|\.sdlg-footer|\.sdlg-title|padding:|overflow-y|max-width|backdrop-filter/);
  // r6 git R6DC-03: the branch-switch dialog is cc43287c9 Jie on CdsAlertDialog now; its hand-copied sbs-* sheet is gone.
  assert.equal(fs.existsSync(path.join(app, 'src/source-branch-switch-dialog.css')), false);
  for (const file of ['src/source-session-actions.css', 'src/source-customize.css', 'src/source-titlebar.css'])
    assert.doesNotMatch(read(file), /data-dialog-size|\.sdlg-header|\.sdlg-heading|\.sdlg-title|\.sdlg-description|sdlg-close/, file);
});

test('r2-shared-06 SSR callers: Keyboard shortcuts (md, comfortable) renders in the Zv body (the rewind confirm: narrow-layout-session-fixes)', () => {
  const shortcuts = withDocument(() => renderToStaticMarkup(h(Actions.KeyboardShortcutsDialog, { onClose() {} })));
  assert.match(shortcuts, /<section[^>]*data-cds="Dialog"[^>]*class="sdlg-popup draggable-none [^"]* max-w-\[520px\] [^"]*shortcuts-dialog[^"]*"><div class="isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-\[inherit\] p-xl break-words"><div class="sdlg-header mb-pad-md flex items-start gap-2">/);
  assert.match(shortcuts, /data-density="comfortable"/);
});

test('css2-composer-gutter-780: the viewport 780px rule is gone; the Code composer column follows the tile at 560px like the transcript', () => {
  assert.doesNotMatch(read('src/style.css'), /max-width: 780px/);
  const composer = read('src/source-composer.css');
  // W14-code r2 closeout-2 (css2-chat-gutter-shave): gg sets --chat-gutter 16px and the column gutters follow it (shared-6 vg).
  assert.ok(composer.includes('@container (max-width: 560px) { .sc-zone.composer-zone { --chat-gutter: 16px; } }'));
  assert.ok(read('src/source-transcript.css').includes('@container (max-width: 560px) {'));
  assert.ok(fs.readFileSync(path.join(app, 'src/generated/code-composer/chat-composer-layout.mjs'), 'utf8').length > 0);
});

test('css2-spinner-attachment: the pending image is the Om Skeleton overlay with the sr-only status; Customize uses CdsSpinner; .sc-spinner is gone', () => {
  const official = fs.readFileSync(path.join(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2/shared-2-TF8v67kg.js'), 'utf8');
  assert.ok(official.includes('children: u(Be, { className: "absolute inset-0 size-full rounded-card" }),'));
  const html = renderToStaticMarkup(h(Attachments.SourceComposerAttachments, { entries: [{ id: 'i', kind: 'image', name: 'shot.png', status: 'loading', previewUrl: 'blob:x' }], onRemove() {} }));
  assert.match(html, /<span aria-hidden="true" class="contents"><div[^>]*data-cds="Skeleton"[^>]*class="[^"]*absolute inset-0 size-full rounded-card[^"]*"/);
  assert.match(html, /<span role="status" class="sr-only">Processing image<\/span>/);
  for (const file of ['src/source-composer.css', 'src/source-customize.css', 'src/source-composer-attachments.css', 'src/source-composer-attachments.jsx', 'src/source-customize.jsx'])
    assert.doesNotMatch(read(file), /sc-spinner|sca-loading|cz-checking/, file);
  const customize = read('src/source-customize.jsx');
  assert.ok(customize.includes('<CdsSpinner size="sm" />') && customize.includes('<CdsSpinner size="md" />'));
});

test('r2-shared-03 / r2-shared-09: install results are toasts; Update picks the official c6692ffeb W sentence', () => {
  const customize = read('src/source-customize.jsx');
  assert.doesNotMatch(customize, /<p className="cz-muted" role="status">\{outcome\.restartRequired|<p className="cz-error" role="alert">\{pluginFailureMessage\(outcome\.message, "install"\)\}/);
  // W14-code r3 r3-shared-01: the same toast, now sent from the install's settle callback (`announce`, c76f00e40's mutation
  // callback) instead of from the form's mount-time effect.
  assert.ok(customize.includes('toasts?.add?.(pluginFailureMessage(result.message, "install"), { variant: "danger" });'));
  assert.doesNotMatch(customize, /Updated\. New sessions use the new version\./);
  assert.equal(Model.pluginUpdateToast({ ok: true }), 'Plugin updated.');
  assert.equal(Model.pluginUpdateToast({ ok: true, alreadyUpToDate: true, oldVersion: '1', newVersion: '2' }), 'Plugin is already up to date.');
  assert.equal(Model.pluginUpdateToast({ ok: true, oldVersion: '1.0.0', newVersion: '1.1.0' }), 'Updated from 1.0.0 to 1.1.0.');
  assert.deepEqual(Model.pluginChangeOutcome({ application: 'applied', oldVersion: '1', newVersion: '2', bundle: 'x' }), { ok: true, restartRequired: false, bundle: 'x', oldVersion: '1', newVersion: '2' });
  assert.deepEqual(Model.pluginChangeOutcome({ application: 'applied', bundle: 'x' }), { ok: true, restartRequired: false, bundle: 'x' });
});

test('r2-shared-14: the untrusted project connector offers Trust workspace through the official WorkspaceTrustDialog', () => {
  assert.deepEqual(Model.connectorDetailState({ kind: 'trust', trust: { cwd: '/w' } }), { view: 'trust', issue: false, action: 'trust', label: 'Trust workspace', disabled: false });
  const customize = read('src/source-customize.jsx');
  assert.ok(customize.includes("import { WorkspaceTrustDialog } from './generated/code-routines/index.mjs';"));
  assert.ok(customize.includes('sources={row.trust?.launch ? [row.trust.launch] : []}'));
  // W14-code r6 sh6-04: c516e93ca v closes the dialog only once the trust is saved (tests/w14-r6-sleep.test.mjs).
  assert.ok(customize.includes('onAccept={acceptTrust} onDecline={() => setTrustPrompt(false)} />}'));
  assert.doesNotMatch(customize, /t\("Trust this folder"\)|t\("The folder couldn’t be trusted\."\)/);
  assert.ok(read('src/customize-model.mjs').includes('label: t("Trust workspace")'));
});

test('DC-12: the rewind confirm counts use the CDS git colours without the 2.x fallbacks', () => {
  const css = read('src/source-session-actions.css');
  assert.ok(css.includes('.rewind-confirm-added{color:var(--cds-text-git-added)}') && css.includes('.rewind-confirm-removed{color:var(--cds-text-git-removed)}'));
  assert.doesNotMatch(css, /#28723c|#bb4142/);
});

test('r6 git R6DC-03: the branch-switch dialog is cc43287c9 Jie on CdsAlertDialog + CdsSplitDropdownButton + CdsButton', async () => {
  const source = read('src/source-branch-switch-dialog.jsx');
  for (const line of [
    'import { CdsAlertDialog, CdsButton, CdsRoot, CdsSplitDropdownButton } from "./generated/view-tabs/index.js";',
    '<CdsRoot density="compact" experimental={codePaneExperimental} className="contents">',
    '<CdsAlertDialog.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={(next) => { if (!next) onExited?.(); }}>',
    '<CdsAlertDialog.Popup className="epitaxy-root break-words max-w-[30rem]" initialFocus={cancelRef}>',
    '<div className="flex flex-col gap-sm">',
    '<CdsAlertDialog.Description className="mt-0">',
    '<CdsAlertDialog.Footer align="between">',
    'items={items} side="top" align="end" collisionPadding={menuCollisionPadding} />',
    'checkedRole: "radio", onSelect: () => setMode(option)',
    '<p className="flex flex-wrap items-center gap-1.25 text-body text-secondary">',
    '<p className="text-body text-secondary">',
    '<span className="font-mono-ui text-caption"',
    'const branchCode = (chunks) => <code className="text-code-regular text-primary">{chunks}</code>;',
  ]) assert.ok(source.includes(line), line);
  for (const id of ['ipYtl3IVht', 'jGBYn1q7Ts', 'qhAHI7pagG', 'wwn0pRsf6i', 'ETzdRE7DsE', '4M/7DCOUkQ', 'vuCXR4HhzH', 'jKWkgYpA3L', 'yxguVqGJ5K', 'cyR7KhiuaU', '47FYwba+bI', 'nmpevlUATU', 'RFSVo0ph8h'])
    assert.ok(source.includes(`id="${id}"`) || source.includes(`id: "${id}"`), id);
  // The 2.42304.0 host copy (SourceDialog, SourceSettingsButton, the SourceMenu split stand-in, sbs-* CSS) is gone.
  assert.doesNotMatch(source, /SourceDialog|SourceSettingsButton|SourceMenu|sbs-|\.css"/);
  // The official rich-text / plural copy formats in zh-CN through the host intl (t() on the defaultMessage).
  const adapters = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const before = i18n.getLocale();
  try {
    i18n.setLocale('zh-CN');
    const intl = adapters.createStartIntl();
    const b = (chunks) => `[${chunks.join('')}]`;
    assert.equal(intl.formatMessage({ defaultMessage: 'Uncommitted changes on <b>{currentBranch}</b>', id: 'ipYtl3IVht' }, { currentBranch: 'main', b }), '[main] 上有未提交的更改');
    assert.equal(intl.formatMessage({ defaultMessage: 'Handle them before switching to <b>{targetBranch}</b>.', id: 'jGBYn1q7Ts' }, { targetBranch: 'x', b }), '请在切换到 [x] 之前处理这些更改。');
    assert.equal(intl.formatMessage({ defaultMessage: 'All uncommitted changes on <b>{currentBranch}</b> will be permanently lost.', id: 'qhAHI7pagG' }, { currentBranch: 'main', b }), '[main] 上所有未提交的更改都将永久丢失。');
    const others = '{count, plural, one {# other session is using this folder. Switching branches will affect it too.} other {# other sessions are using this folder. Switching branches will affect them too.}}';
    assert.equal(intl.formatMessage({ defaultMessage: others, id: 'ETzdRE7DsE' }, { count: 1 }), '另有 1 个会话正在使用此文件夹。切换分支也会影响该会话。');
    assert.equal(intl.formatMessage({ defaultMessage: others, id: 'ETzdRE7DsE' }, { count: 3 }), '另有 3 个会话正在使用此文件夹。切换分支也会影响这些会话。');
    assert.equal(intl.formatMessage({ defaultMessage: '{count, plural, one {# file} other {# files}} changed', id: '4M/7DCOUkQ' }, { count: 2 }), '2 个文件已更改');
  } finally { i18n.setLocale(before); }
});
