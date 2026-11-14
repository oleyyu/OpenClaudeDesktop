// R4e-preview (preview-13): SourceTooltip's optional keepReasonWrapper renders shared-frame-BfjMqbuN Qp as the original
// does — the Uc wrapper and the Yc reason span always there, focusable and described only while there is a reason —
// and leaves the default disabledReason branch as it was. SSR only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const frame = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-frame-BfjMqbuN.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const WRAPPER = 'inline-flex rounded outline-none focus-visible:outline-hidden [&amp;[data-initial-focus]:focus]:outline-hidden transition-shadow duration-fast focus-visible:shadow-focus [&amp;[data-initial-focus]:focus]:shadow-focus';

let server, T;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  T = await server.ssrLoadModule('/src/source-tooltip.jsx');
});
after(() => server?.close());

const html = (props, child = React.createElement('button', { type: 'button', disabled: props.childDisabled }, 'Go')) => {
  const { childDisabled, ...rest } = props;
  void childDisabled;
  return renderToStaticMarkup(React.createElement(T.SourceTooltip, rest, child));
};

test('source: Qp / Uc / Yc as keepReasonWrapper renders them (2.42304.0 shared-frame)', () => {
  for (const text of [
    'function Qp({reason:e,side:t,align:n,sideOffset:r,multiline:i=!0,delay:a,collisionPadding:o,hoverable:s,className:c,wrapperClassName:l,children:u}){let d=Pe();return H(Zp,{content:Wc(e)?e:void 0,side:t,align:n,sideOffset:r,multiline:i,delay:a,collisionPadding:o,hoverable:s,className:c,closeOnClick:!1,openOnHandedBackFocus:!0,children:T("span",{...Uc(e,d,l),children:[u,H(Yc,{id:d,reason:e})]})})}',
    'function Uc(e,t,n){let r=Wc(e);return{ref:Hc,tabIndex:r?0:-1,"aria-describedby":r?t:void 0,"data-cds-disabled-reason-wrapper":"",className:X("inline-flex",Vc,n)}}',
    'function Wc(e){return!!e}',
    'H("span",{ref:n,id:e,hidden:!0,[Jc]:"",children:Wc(t)?t:null},qc(Wc(t)?t:null))',
  ]) assert.equal(count(frame, text), 1, text);
});

test('the default branches are unchanged: a reason only around a disabled child, in the local trigger span', () => {
  assert.equal(html({ content: 'Tip' }), '<button type="button">Go</button>');
  assert.equal(html({ content: 'Tip', disabledReason: 'Why' }), '<button type="button">Go</button>', 'an enabled child gets no reason');
  const disabled = html({ content: 'Tip', disabledReason: 'Why', childDisabled: true });
  const match = /^<span class="source-tooltip-disabled-trigger" tabindex="0" aria-describedby="([^"]+)"><button type="button" disabled="">Go<\/button><span id="([^"]+)" hidden="" data-cds-disabled-reason="">Why<\/span><\/span>$/.exec(disabled);
  assert.ok(match, disabled);
  assert.equal(match[1], match[2]);
  assert.match(html({ content: 'Tip', disabledReason: 'Why', childDisabled: true, wrapperClassName: 'w-full' }), /^<span class="source-tooltip-disabled-trigger w-full"/);
});

test('keepReasonWrapper: the Uc wrapper and Yc span stay without a reason, inert (tabIndex -1, no description)', () => {
  for (const reason of [null, undefined, '']) {
    const out = html({ disabledReason: reason, keepReasonWrapper: true });
    const id = /<span id="([^"]+)" hidden=""/.exec(out)?.[1];
    assert.ok(id, out);
    assert.equal(out, `<span tabindex="-1" data-cds-disabled-reason-wrapper="" class="${WRAPPER}"><button type="button">Go</button><span id="${id}" hidden="" data-cds-disabled-reason=""></span></span>`, String(reason));
  }
});

test('keepReasonWrapper: with a reason the wrapper is the focus stop, described by the hidden reason (any child, as Wc)', () => {
  for (const childDisabled of [true, false]) {
    const out = html({ disabledReason: 'Tab limit reached.', keepReasonWrapper: true, childDisabled, wrapperClassName: 'extra' });
    const match = new RegExp(`^<span tabindex="0" aria-describedby="([^"]+)" data-cds-disabled-reason-wrapper="" class="${WRAPPER.replace(/[[\]().*+?^$|]/g, '\\$&')} extra"><button type="button"${childDisabled ? ' disabled=""' : ''}>Go</button><span id="([^"]+)" hidden="" data-cds-disabled-reason="">Tab limit reached\\.</span></span>$`).exec(out);
    assert.ok(match, out);
    assert.equal(match[1], match[2]);
  }
});
