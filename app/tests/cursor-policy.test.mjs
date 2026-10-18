import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// R08 cursor policy. The original frame marks <html data-dframe> (sidebar-main.js:15140-15146 sR,
// called from mR :15362) and the loaded shared-styles copy of desktop-layout.css:1026-1047 then gives
// buttons, [role=button], [role=menuitem], in-app anchors and .cursor-pointer an arrow; only real links
// (a[href] that is not a button or menu item, button.underline, .cds-text-link[role=button],
// button.df-link-btn) keep the pointer. Local CSS that ported Tailwind cursor-pointer literally would
// bring the hand back, so no local declaration may set cursor:pointer outside the link allowlist.
const app = path.resolve(import.meta.dirname, '..');
const src = path.join(app, 'src'), official = path.join(app, 'public/assets/v1');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

// Selectors that may keep the pointer, each a link in the original's terms.
const LINK_SELECTORS = [
  // CDS TextLink (shared-frame-C_2npUJq.js:3562-3640 renders span role=button.cds-text-link): the
  // desktop-layout.css:1035-1036 pointer exception while enabled (message-style.css).
  ':root[data-dframe] [data-cds="TextLink"]:not(:disabled):not([data-disabled]):not(.cursor-default)',
  // Workflow card member Skip/Retry (source-workflow.jsx): borderless text buttons underlined on hover, the
  // original's button.underline link exception (desktop-layout.css:1035-1036).
  '.swf-member-controls button',
];

/** Every `selector { … cursor: pointer … }` rule in a stylesheet, as [selector, line]. */
function pointerRules(css) {
  const text = strip(css), found = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rule.exec(text))) {
    if (!/(?:^|;)\s*cursor\s*:\s*pointer\b/i.test(match[2])) continue;
    const line = text.slice(0, match.index + match[1].length).split('\n').length;
    found.push([match[1].trim().replace(/\s+/g, ' '), line]);
  }
  return found;
}

test('<html> carries data-dframe so the loaded desktop-layout cursor rules apply', () => {
  const html = readFileSync(path.join(app, 'index.html'), 'utf8');
  const root = /<html\b[^>]*>/i.exec(html)?.[0] ?? '';
  assert.match(root, /\sdata-dframe(?:=""|\s|>)/);
  assert.match(root, /class="cds-root"/);
  assert.match(root, /data-platform="desktop"/);
  // The rules themselves come from the loaded shared-styles copy, not from local CSS.
  assert.match(html, /<link rel="stylesheet" href="\/assets\/v1\/shared-styles-Bl9zqrv-\.css"/);
  const shared = readFileSync(path.join(official, 'shared-styles-Bl9zqrv-.css'), 'utf8');
  // 2.31226.0 (shared-styles-Bl9zqrv-.css) keeps explicit grab/move/resize cursors out of both rules.
  const keep = ':where(:not([class*=cursor-grab],[class*=cursor-move],[class*=cursor-all-scroll],[class*=cursor-][class*=-resize]))';
  assert.ok(shared.includes([':root[data-dframe] button', ':root[data-dframe] [role=button]', ':root[data-dframe] [role=menuitem]', ':root[data-dframe] a:not([target=_blank])', ':root[data-dframe] .cursor-pointer', ':root[data-dframe] .cursor-interactive'].map((selector) => selector + keep).join(',') + '{cursor:default}'));
  assert.ok(shared.includes(':root[data-dframe] a[href]:not([role=button],[role=tab],[role=option],[role=switch],[role=checkbox],[role=radio]):not([role^=menuitem]):not(.df-link-card):not([data-cds=Button])' + keep + ','));
  assert.match(shared, /:root\[data-dframe\] button\.df-link-btn:not\(:disabled\)\{cursor:pointer\}/);
});

test('no app/src/*.css declares cursor:pointer outside the link allowlist', () => {
  const offenders = [];
  for (const name of readdirSync(src).filter((file) => file.endsWith('.css')).sort())
    for (const [selector, line] of pointerRules(readFileSync(path.join(src, name), 'utf8')))
      if (!LINK_SELECTORS.includes(selector)) offenders.push(`${name}:${line} ${selector}`);
  assert.deepEqual(offenders, []);
});

test('the scan finds pointer declarations in compact and expanded rules, and ignores comments', () => {
  const sample = '.a{display:flex;cursor:pointer}\n/* .b{cursor:pointer} */\n.c {\n  color: red;\n  cursor: pointer;\n}\n.d{cursor:var(--cds-cursor-interactive,default)}\n.e{cursor:pointer !important}';
  assert.deepEqual(pointerRules(sample).map(([selector]) => selector), ['.a', '.c', '.e']);
});
